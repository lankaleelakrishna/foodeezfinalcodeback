import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';

export enum CustomerTicketType {
  MISSING_ITEM = 'MISSING_ITEM',
  WRONG_ORDER = 'WRONG_ORDER',
  DELIVERY_ISSUE = 'DELIVERY_ISSUE',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  REFUND_REQUEST = 'REFUND_REQUEST',
  FOOD_QUALITY = 'FOOD_QUALITY',
  OTHER = 'OTHER',
}

export enum CustomerTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum CustomerTicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Entity({ name: 'customer_support_tickets' })
export class CustomerSupportTicketEntity {
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

  @Column({ name: 'customer_id', type: 'text' })
  customerId: string;

  @ManyToOne(() => CustomerEntity, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity;

  @Column({ name: 'order_id', type: 'text', nullable: true })
  orderId?: string;

  @Column({ name: 'ticket_number', unique: true })
  ticketNumber: string;

  @Column({ type: 'enum', enum: CustomerTicketType })
  type: CustomerTicketType;

  @Column({ type: 'enum', enum: CustomerTicketStatus, default: CustomerTicketStatus.OPEN })
  status: CustomerTicketStatus;

  @Column({ type: 'enum', enum: CustomerTicketPriority, default: CustomerTicketPriority.MEDIUM })
  priority: CustomerTicketPriority;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote?: string;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
