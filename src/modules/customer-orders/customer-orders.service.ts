import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  CustomerOrderEntity,
  CustomerOrderPaymentMethod,
  CustomerOrderPaymentStatus,
  CustomerOrderStatus,
} from '../../entities/customer-order.entity';
import { CustomerOrderItemEntity } from '../../entities/customer-order-item.entity';
import { CustomerOrderStatusHistoryEntity } from '../../entities/customer-order-status-history.entity';
import { CustomerCartEntity } from '../../entities/customer-cart.entity';
import { CustomerCartItemEntity } from '../../entities/customer-cart-item.entity';
import { CustomerEntity } from '../../entities/customer.entity';
import { CustomerAddressEntity } from '../../entities/customer-address.entity';
import { CustomerWalletEntity } from '../../entities/customer-wallet.entity';
import { CustomerWalletTransactionEntity, WalletTransactionType } from '../../entities/customer-wallet-transaction.entity';
import { CustomerCouponUsageEntity } from '../../entities/customer-coupon-usage.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Injectable()
export class CustomerOrdersService {
  constructor(
    @InjectRepository(CustomerOrderEntity)
    private readonly orderRepo: Repository<CustomerOrderEntity>,
    @InjectRepository(CustomerOrderItemEntity)
    private readonly orderItemRepo: Repository<CustomerOrderItemEntity>,
    @InjectRepository(CustomerOrderStatusHistoryEntity)
    private readonly historyRepo: Repository<CustomerOrderStatusHistoryEntity>,
    @InjectRepository(CustomerCartEntity)
    private readonly cartRepo: Repository<CustomerCartEntity>,
    @InjectRepository(CustomerAddressEntity)
    private readonly addressRepo: Repository<CustomerAddressEntity>,
    @InjectRepository(CustomerWalletEntity)
    private readonly walletRepo: Repository<CustomerWalletEntity>,
    @InjectRepository(CustomerCouponUsageEntity)
    private readonly couponUsageRepo: Repository<CustomerCouponUsageEntity>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async placeOrder(customerId: string, dto: PlaceOrderDto): Promise<CustomerOrderEntity> {
    const cart = await this.cartRepo.findOne({
      where: { customerId },
      relations: ['items'],
    });
    if (!cart || !cart.items.length) throw new BadRequestException('Cart is empty');

    const address = await this.addressRepo.findOne({
      where: { id: dto.deliveryAddressId, customerId, deletedAt: IsNull() },
    });
    if (!address) throw new NotFoundException('Delivery address not found');

    return this.dataSource.transaction(async (manager) => {
      let walletAmountUsed = 0;

      if (dto.useWalletBalance) {
        const wallet = await manager.findOne(CustomerWalletEntity, {
          where: { customerId },
        });
        if (wallet && Number(wallet.balance) > 0) {
          walletAmountUsed = Math.min(Number(wallet.balance), Number(cart.grandTotal));

          const newBalance = Number(wallet.balance) - walletAmountUsed;
          await manager.update(CustomerWalletEntity, { customerId }, { balance: newBalance });

          const walletTx = manager.create(CustomerWalletTransactionEntity, {
            walletId: wallet.id,
            type: WalletTransactionType.DEBIT,
            amount: walletAmountUsed,
            balanceAfter: newBalance,
            description: 'Used for order payment',
            referenceType: 'order',
          });
          await manager.save(CustomerWalletTransactionEntity, walletTx);
        }
      }

      const orderNumber = await this.generateOrderNumber(manager);
      const grandTotal = Math.max(0, Number(cart.grandTotal) - walletAmountUsed);

      const order = manager.create(CustomerOrderEntity, {
        orderNumber,
        customerId,
        restaurantId: cart.restaurantId,
        branchId: cart.branchId,
        deliveryAddressId: dto.deliveryAddressId,
        deliveryAddressSnapshot: {
          label: address.label,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          landmark: address.landmark,
          latitude: address.latitude,
          longitude: address.longitude,
        },
        paymentMethod: dto.paymentMethod,
        paymentStatus:
          dto.paymentMethod === CustomerOrderPaymentMethod.COD
            ? CustomerOrderPaymentStatus.PENDING
            : CustomerOrderPaymentStatus.PENDING,
        subtotal: cart.subtotal,
        deliveryFee: cart.deliveryFee,
        packagingFee: cart.packagingFee,
        taxAmount: cart.taxAmount,
        surgeFee: cart.surgeFee,
        couponDiscount: cart.couponDiscount,
        walletAmountUsed,
        grandTotal,
        couponCode: cart.appliedCouponCode,
        specialInstructions: dto.specialInstructions,
        isScheduled: !!dto.scheduledFor,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        status: CustomerOrderStatus.PLACED,
      });

      const savedOrder = await manager.save(CustomerOrderEntity, order);

      // Save order items from cart
      const items = cart.items.map((ci) =>
        manager.create(CustomerOrderItemEntity, {
          orderId: savedOrder.id,
          menuItemId: ci.menuItemId,
          name: ci.menuItemName,
          unitPrice: ci.unitPrice,
          quantity: ci.quantity,
          selectedAddons: ci.selectedAddons,
          itemTotal: ci.itemTotal,
          specialNote: ci.specialNote,
        }),
      );
      await manager.save(CustomerOrderItemEntity, items);

      // Record initial status history
      await manager.save(
        CustomerOrderStatusHistoryEntity,
        manager.create(CustomerOrderStatusHistoryEntity, {
          orderId: savedOrder.id,
          status: CustomerOrderStatus.PLACED,
          changedBy: 'customer',
        }),
      );

      // Record coupon usage
      if (cart.appliedCouponCode && Number(cart.couponDiscount) > 0) {
        await manager.save(
          CustomerCouponUsageEntity,
          manager.create(CustomerCouponUsageEntity, {
            customerId,
            couponId: cart.appliedCouponCode,
            orderId: savedOrder.id,
            discountApplied: cart.couponDiscount,
          }),
        );
      }

      // Update wallet reference in order if used
      if (walletAmountUsed > 0) {
        await manager.update(CustomerWalletTransactionEntity, { referenceType: 'order' }, {
          referenceId: savedOrder.id,
        });
      }

      // Update customer stats
      await manager.increment(CustomerEntity, { id: customerId }, 'totalOrders', 1);
      await manager.query(
        `UPDATE customers SET total_spend = total_spend + $1, last_order_at = NOW() WHERE id = $2`,
        [Number(cart.grandTotal), customerId],
      );

      // Clear cart
      await manager.delete(CustomerCartItemEntity, { cartId: cart.id });
      await manager.delete(CustomerCartEntity, { id: cart.id });

      return savedOrder;
    });
  }

  async getOrderHistory(
    customerId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: CustomerOrderEntity[]; meta: object }> {
    const [data, total] = await this.orderRepo.findAndCount({
      where: { customerId },
      relations: ['items', 'restaurant', 'branch'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((o: any) => ({
        ...o,
        amount: o.grandTotal !== undefined ? Number(o.grandTotal) : 0,
        restaurantLabel: o.branch?.name ?? o.restaurant?.name ?? null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getOrderDetail(customerId: string, orderId: string): Promise<CustomerOrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
      relations: ['items', 'statusHistory', 'restaurant', 'branch'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(customerId: string, orderId: string, dto: CancelOrderDto): Promise<{ message: string }> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, customerId } });
    if (!order) throw new NotFoundException('Order not found');

    const nonCancellable = [
      CustomerOrderStatus.PICKED_UP,
      CustomerOrderStatus.ON_THE_WAY,
      CustomerOrderStatus.DELIVERED,
      CustomerOrderStatus.CANCELLED,
    ];
    if (nonCancellable.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    await this.orderRepo.update(orderId, {
      status: CustomerOrderStatus.CANCELLED,
      cancellationReason: dto.reason,
      cancelledBy: 'customer',
      cancelledAt: new Date(),
    });

    await this.historyRepo.save(
      this.historyRepo.create({
        orderId,
        status: CustomerOrderStatus.CANCELLED,
        changedBy: 'customer',
        note: dto.reason,
      }),
    );

    if (order.paymentStatus === CustomerOrderPaymentStatus.PAID) {
      await this.processRefundToWallet(order);
    }

    return { message: 'Order cancelled successfully' };
  }

  async updateOrderStatus(
    orderId: string,
    status: CustomerOrderStatus,
    changedBy: string,
    note?: string,
  ): Promise<void> {
    await this.orderRepo.update(orderId, { status });
    await this.historyRepo.save(
      this.historyRepo.create({ orderId, status, changedBy, note }),
    );
  }

  async reorder(customerId: string, orderId: string): Promise<{ items: CustomerOrderItemEntity[]; restaurantId: string; branchId: string }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return { items: order.items, restaurantId: order.restaurantId, branchId: order.branchId };
  }

  async getLiveTrackingData(customerId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveryPartnerId: order.deliveryPartnerId,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      deliveryAddressSnapshot: order.deliveryAddressSnapshot,
      socketRoom: `order-${order.id}`,
    };
  }

  async generateInvoice(customerId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Order not found');

    return {
      invoiceNumber: `INV-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      deliveryAddress: order.deliveryAddressSnapshot,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.itemTotal,
        addons: i.selectedAddons,
      })),
      pricing: {
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        packagingFee: order.packagingFee,
        taxAmount: order.taxAmount,
        surgeFee: order.surgeFee,
        couponDiscount: order.couponDiscount,
        walletAmountUsed: order.walletAmountUsed,
        grandTotal: order.grandTotal,
      },
      couponCode: order.couponCode,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    };
  }

  private async processRefundToWallet(order: CustomerOrderEntity): Promise<void> {
    const wallet = await this.walletRepo.findOne({ where: { customerId: order.customerId } });
    if (!wallet) return;

    const refundAmount = Number(order.grandTotal);
    const newBalance = Number(wallet.balance) + refundAmount;

    await this.walletRepo.update(wallet.id, { balance: newBalance });
    await this.dataSource.getRepository(CustomerWalletTransactionEntity).save(
      this.dataSource.getRepository(CustomerWalletTransactionEntity).create({
        walletId: wallet.id,
        type: WalletTransactionType.REFUND_CREDIT,
        amount: refundAmount,
        balanceAfter: newBalance,
        description: `Refund for order #${order.orderNumber}`,
        referenceId: order.id,
        referenceType: 'order',
      }),
    );

    await this.orderRepo.update(order.id, {
      refundAmount,
      refundStatus: 'refunded_to_wallet',
    });
  }

  private async generateOrderNumber(manager: any): Promise<string> {
    const year = new Date().getFullYear();
    const count = await manager.count(CustomerOrderEntity);
    return `FDZ-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
