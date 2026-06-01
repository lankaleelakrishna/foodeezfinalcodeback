import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';
import { CustomerOrderItemEntity } from './customer-order-item.entity';
import { CustomerOrderStatusHistoryEntity } from './customer-order-status-history.entity';
import { RestaurantEntity } from './restaurant.entity';
import { BranchEntity } from './branch.entity';

export enum CustomerOrderStatus {
  PLACED = 'PLACED',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  PICKED_UP = 'PICKED_UP',
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum CustomerOrderPaymentMethod {
  COD = 'COD',
  ONLINE = 'ONLINE',
  WALLET = 'WALLET',
  WALLET_PLUS_ONLINE = 'WALLET_PLUS_ONLINE',
}

export enum CustomerOrderPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

@Entity({ name: 'customer_orders' })
export class CustomerOrderEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
    const now = new Date();
    if (!this.createdAt) this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }

  @Column({ name: 'order_number', unique: true })
  orderNumber: string;

  @Column({ name: 'customer_id', type: 'text' })
  customerId: string;

  @ManyToOne(() => CustomerEntity, (c) => c.orders)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity;

  @Column({ name: 'restaurant_id', type: 'text' })
  restaurantId: string;

  @Column({ name: 'branch_id', type: 'text' })
  branchId: string;

  @Column({ name: 'delivery_address_id', type: 'text', nullable: true })
  deliveryAddressId?: string;

  @Column({ name: 'delivery_address_snapshot', type: 'jsonb' })
  deliveryAddressSnapshot: Record<string, any>;

  @Column({
    type: 'enum',
    enum: CustomerOrderStatus,
    default: CustomerOrderStatus.PLACED,
  })
  status: CustomerOrderStatus;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: CustomerOrderPaymentMethod,
  })
  paymentMethod: CustomerOrderPaymentMethod;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: CustomerOrderPaymentStatus,
    default: CustomerOrderPaymentStatus.PENDING,
  })
  paymentStatus: CustomerOrderPaymentStatus;

  @Column({ name: 'payment_transaction_id', nullable: true })
  paymentTransactionId?: string;

  @Column({ name: 'subtotal', type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ name: 'delivery_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ name: 'packaging_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  packagingFee: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'surge_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  surgeFee: number;

  @Column({ name: 'coupon_discount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  couponDiscount: number;

  @Column({ name: 'wallet_amount_used', type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletAmountUsed: number;

  @Column({ name: 'grand_total', type: 'decimal', precision: 10, scale: 2 })
  grandTotal: number;

  @Column({ name: 'coupon_code', nullable: true })
  couponCode?: string;

  @Column({ name: 'is_scheduled', default: false })
  isScheduled: boolean;

  @Column({ name: 'scheduled_for', type: 'timestamptz', nullable: true })
  scheduledFor?: Date;

  @Column({ name: 'delivery_partner_id', type: 'text', nullable: true })
  deliveryPartnerId?: string;

  @Column({ name: 'estimated_delivery_time', type: 'int', nullable: true })
  estimatedDeliveryTime?: number;

  @Column({ name: 'special_instructions', nullable: true })
  specialInstructions?: string;

  @Column({ name: 'cancellation_reason', nullable: true })
  cancellationReason?: string;

  @Column({ name: 'cancelled_by', nullable: true })
  cancelledBy?: string;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount?: number;

  @Column({ name: 'refund_status', nullable: true })
  refundStatus?: string;

  @OneToMany(() => CustomerOrderItemEntity, (i) => i.order, { cascade: true })
  items: CustomerOrderItemEntity[];

  @OneToMany(() => CustomerOrderStatusHistoryEntity, (h) => h.order, { cascade: true })
  statusHistory: CustomerOrderStatusHistoryEntity[];

  @ManyToOne(() => RestaurantEntity)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant?: RestaurantEntity;

  @ManyToOne(() => BranchEntity)
  @JoinColumn({ name: 'branch_id' })
  branch?: BranchEntity;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
