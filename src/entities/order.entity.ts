import { randomUUID } from 'crypto';
import { BeforeInsert, BeforeUpdate, Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { BranchEntity } from './branch.entity';
import { RestaurantEntity } from './restaurant.entity';

export enum OrderStatus {
  New = 'NEW',
  Confirmed = 'CONFIRMED',
  Preparing = 'PREPARING',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
}

export enum PaymentStatus {
  Pending = 'PENDING',
  Paid = 'PAID',
  Failed = 'FAILED',
}

@Entity({ name: 'Order' })
export class OrderEntity {
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

  @ManyToOne(() => RestaurantEntity, { nullable: false })
  restaurant: RestaurantEntity;

  @ManyToOne(() => BranchEntity, { nullable: false })
  branch: BranchEntity;

  @Column('numeric', { name: 'total_amount' })
  totalAmount: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.New })
  status: OrderStatus;

  @Column({ name: 'payment_status', type: 'enum', enum: PaymentStatus, default: PaymentStatus.Pending })
  paymentStatus: PaymentStatus;

  @Column({ name: 'item_count', type: 'int', default: 0 })
  itemCount: number;

  @Column('numeric', { name: 'discount_amount', default: 0 })
  discountAmount: number;

  @Column('numeric', { name: 'tax_amount', default: 0 })
  taxAmount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
