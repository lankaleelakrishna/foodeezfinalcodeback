import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { CustomerOrderEntity, CustomerOrderStatus } from './customer-order.entity';

@Entity({ name: 'customer_order_status_history' })
export class CustomerOrderStatusHistoryEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
    if (!this.createdAt) this.createdAt = new Date();
  }

  @Column({ name: 'order_id', type: 'text' })
  orderId: string;

  @ManyToOne(() => CustomerOrderEntity, (o) => o.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: CustomerOrderEntity;

  @Column({ type: 'enum', enum: CustomerOrderStatus, enumName: 'customer_order_status_enum' })
  status: CustomerOrderStatus;

  @Column({ nullable: true })
  note?: string;

  @Column({ name: 'changed_by', nullable: true })
  changedBy?: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
