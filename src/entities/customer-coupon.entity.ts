import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { CustomerCouponUsageEntity } from './customer-coupon-usage.entity';

export enum CouponType {
  FLAT = 'FLAT',
  PERCENTAGE = 'PERCENTAGE',
  FREE_DELIVERY = 'FREE_DELIVERY',
  CASHBACK = 'CASHBACK',
}

export enum CouponApplicability {
  ALL = 'ALL',
  RESTAURANT_SPECIFIC = 'RESTAURANT_SPECIFIC',
  NEW_USER = 'NEW_USER',
  MIN_ORDER = 'MIN_ORDER',
}

@Entity({ name: 'customer_coupons' })
export class CustomerCouponEntity {
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

  @Column({ unique: true })
  code: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: CouponType })
  type: CouponType;

  @Column({ type: 'enum', enum: CouponApplicability, default: CouponApplicability.ALL })
  applicability: CouponApplicability;

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2 })
  discountValue: number;

  @Column({ name: 'max_discount_cap', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountCap?: number;

  @Column({ name: 'min_order_value', type: 'decimal', precision: 10, scale: 2, default: 0 })
  minOrderValue: number;

  @Column({ name: 'restaurant_id', type: 'text', nullable: true })
  restaurantId?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'total_usage_limit', type: 'int', nullable: true })
  totalUsageLimit?: number;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount: number;

  @Column({ name: 'per_user_limit', type: 'int', default: 1 })
  perUserLimit: number;

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom: Date;

  @Column({ name: 'valid_until', type: 'timestamptz' })
  validUntil: Date;

  @OneToMany(() => CustomerCouponUsageEntity, (u) => u.coupon)
  usages: CustomerCouponUsageEntity[];

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
