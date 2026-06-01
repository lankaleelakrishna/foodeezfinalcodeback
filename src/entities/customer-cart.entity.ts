import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { CustomerCartItemEntity } from './customer-cart-item.entity';

@Entity({ name: 'customer_carts' })
export class CustomerCartEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }

  @Column({ name: 'customer_id', type: 'text', unique: true })
  customerId: string;

  @Column({ name: 'restaurant_id', type: 'text', nullable: true })
  restaurantId?: string;

  @Column({ name: 'branch_id', type: 'text', nullable: true })
  branchId?: string;

  @Column({ name: 'applied_coupon_code', nullable: true })
  appliedCouponCode?: string;

  @Column({ name: 'coupon_discount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  couponDiscount: number;

  @Column({ name: 'subtotal', type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'delivery_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ name: 'packaging_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  packagingFee: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'surge_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  surgeFee: number;

  @Column({ name: 'grand_total', type: 'decimal', precision: 10, scale: 2, default: 0 })
  grandTotal: number;

  @OneToMany(() => CustomerCartItemEntity, (i) => i.cart, { cascade: true, eager: true })
  items: CustomerCartItemEntity[];

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
