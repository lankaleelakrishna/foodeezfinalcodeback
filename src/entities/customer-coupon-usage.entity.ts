import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { CustomerCouponEntity } from './customer-coupon.entity';

@Entity({ name: 'customer_coupon_usages' })
export class CustomerCouponUsageEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
    if (!this.createdAt) this.createdAt = new Date();
  }

  @Column({ name: 'customer_id', type: 'text' })
  customerId: string;

  @Column({ name: 'coupon_id', type: 'text' })
  couponId: string;

  @ManyToOne(() => CustomerCouponEntity, (c) => c.usages)
  @JoinColumn({ name: 'coupon_id' })
  coupon: CustomerCouponEntity;

  @Column({ name: 'order_id', type: 'text' })
  orderId: string;

  @Column({ name: 'discount_applied', type: 'decimal', precision: 10, scale: 2 })
  discountApplied: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
