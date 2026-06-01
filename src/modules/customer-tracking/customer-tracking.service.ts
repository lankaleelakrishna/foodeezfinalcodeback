import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerOrderEntity, CustomerOrderStatus } from '../../entities/customer-order.entity';
import { DeliveryTrackingEntity } from '../../entities/delivery-tracking.entity';

@Injectable()
export class CustomerTrackingService {
  constructor(
    @InjectRepository(CustomerOrderEntity)
    private readonly orderRepo: Repository<CustomerOrderEntity>,
    @InjectRepository(DeliveryTrackingEntity)
    private readonly trackingRepo: Repository<DeliveryTrackingEntity>,
  ) {}

  async getOrderTrackingState(customerId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
      relations: ['statusHistory'],
    });
    if (!order) throw new NotFoundException('Order not found');

    let partnerLocation: { latitude: number; longitude: number; speed: number } | null = null;

    const activeStatuses = [
      CustomerOrderStatus.PICKED_UP,
      CustomerOrderStatus.ON_THE_WAY,
    ];

    if (order.deliveryPartnerId && activeStatuses.includes(order.status)) {
      const tracking = await this.trackingRepo.findOne({
        where: { partner: { id: order.deliveryPartnerId } },
        order: { updatedAt: 'DESC' },
      });
      if (tracking) {
        partnerLocation = {
          latitude: Number(tracking.latitude),
          longitude: Number(tracking.longitude),
          speed: Number(tracking.speed),
        };
      }
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusHistory: order.statusHistory,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      deliveryPartnerId: order.deliveryPartnerId,
      partnerLocation,
      deliveryAddress: order.deliveryAddressSnapshot,
      socketNamespace: '/delivery-tracking',
      socketRoom: `order-${order.id}`,
    };
  }
}
