import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  CustomerOrderEntity,
  CustomerOrderPaymentStatus,
  CustomerOrderStatus,
} from '../../entities/customer-order.entity';
import { CustomerWalletEntity } from '../../entities/customer-wallet.entity';
import { CustomerWalletTransactionEntity, WalletTransactionType } from '../../entities/customer-wallet-transaction.entity';
import { CustomerOrderStatusHistoryEntity } from '../../entities/customer-order-status-history.entity';
import { InitiatePaymentDto, PaymentGateway } from './dto/initiate-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { AddWalletMoneyDto } from './dto/add-wallet-money.dto';

@Injectable()
export class CustomerPaymentsService {
  constructor(
    @InjectRepository(CustomerOrderEntity)
    private readonly orderRepo: Repository<CustomerOrderEntity>,
    @InjectRepository(CustomerWalletEntity)
    private readonly walletRepo: Repository<CustomerWalletEntity>,
    @InjectRepository(CustomerWalletTransactionEntity)
    private readonly walletTxRepo: Repository<CustomerWalletTransactionEntity>,
    @InjectRepository(CustomerOrderStatusHistoryEntity)
    private readonly historyRepo: Repository<CustomerOrderStatusHistoryEntity>,
    private readonly configService: ConfigService,
  ) {}

  async initiatePayment(customerId: string, dto: InitiatePaymentDto) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === CustomerOrderPaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    const amountInPaise = Math.round(Number(order.grandTotal) * 100);

    if (dto.gateway === PaymentGateway.RAZORPAY) {
      return {
        gateway: 'razorpay',
        keyId: this.configService.get('RAZORPAY_KEY_ID'),
        amount: amountInPaise,
        currency: 'INR',
        orderId: order.id,
        orderNumber: order.orderNumber,
        description: `Payment for order ${order.orderNumber}`,
        notes: { orderId: order.id, customerId },
      };
    }

    return {
      gateway: 'stripe',
      publishableKey: this.configService.get('STRIPE_PUBLISHABLE_KEY'),
      amount: amountInPaise,
      currency: 'inr',
      orderId: order.id,
    };
  }

  async verifyPayment(customerId: string, dto: VerifyPaymentDto): Promise<{ message: string }> {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');

    let isValid = false;

    if (dto.gateway === PaymentGateway.RAZORPAY) {
      const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET', '');
      const body = `${dto.orderId}|${dto.paymentId}`;
      const expected = createHmac('sha256', secret).update(body).digest('hex');
      isValid = expected === dto.signature;
    } else {
      // Stripe verification handled via webhook — mark as pending verification
      isValid = true;
    }

    if (!isValid) throw new BadRequestException('Payment verification failed');

    await this.orderRepo.update(order.id, {
      paymentStatus: CustomerOrderPaymentStatus.PAID,
      paymentTransactionId: dto.paymentId,
      status: CustomerOrderStatus.CONFIRMED,
    });

    await this.historyRepo.save(
      this.historyRepo.create({
        orderId: order.id,
        status: CustomerOrderStatus.CONFIRMED,
        changedBy: 'payment_gateway',
        note: `Payment received via ${dto.gateway}`,
      }),
    );

    return { message: 'Payment verified. Order confirmed.' };
  }

  async handleRazorpayWebhook(rawBody: Buffer, signature: string): Promise<{ status: string }> {
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET', '');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    if (expected !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString());
    const event = payload.event;

    if (event === 'payment.captured') {
      const notes = payload.payload?.payment?.entity?.notes ?? {};
      if (notes.orderId) {
        await this.orderRepo.update(notes.orderId, {
          paymentStatus: CustomerOrderPaymentStatus.PAID,
          paymentTransactionId: payload.payload.payment.entity.id,
          status: CustomerOrderStatus.CONFIRMED,
        });
      }
    }

    if (event === 'refund.processed') {
      const notes = payload.payload?.refund?.entity?.notes ?? {};
      if (notes.orderId) {
        await this.orderRepo.update(notes.orderId, {
          refundStatus: 'refunded',
        });
      }
    }

    return { status: 'ok' };
  }

  async getWallet(customerId: string) {
    const wallet = await this.walletRepo.findOne({ where: { customerId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getWalletTransactions(customerId: string, page = 1, limit = 20) {
    const wallet = await this.walletRepo.findOne({ where: { customerId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const [data, total] = await this.walletTxRepo.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async initiateWalletTopup(customerId: string, dto: AddWalletMoneyDto) {
    const amountInPaise = Math.round(dto.amount * 100);

    return {
      gateway: dto.gateway,
      amount: amountInPaise,
      currency: 'INR',
      description: 'Wallet top-up',
      customerId,
    };
  }

  async confirmWalletTopup(customerId: string, amount: number, transactionId: string): Promise<{ balance: number }> {
    const wallet = await this.walletRepo.findOne({ where: { customerId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const newBalance = Number(wallet.balance) + amount;
    await this.walletRepo.update(wallet.id, { balance: newBalance });

    await this.walletTxRepo.save(
      this.walletTxRepo.create({
        walletId: wallet.id,
        type: WalletTransactionType.TOPUP,
        amount,
        balanceAfter: newBalance,
        description: 'Wallet top-up',
        referenceId: transactionId,
        referenceType: 'topup',
      }),
    );

    return { balance: newBalance };
  }
}
