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
import { DeliveryPartnerEntity } from './delivery-partner.entity';

export enum SupportTicketType {
  SOS = 'SOS',
  COMPLAINT = 'COMPLAINT',
  QUERY = 'QUERY',
  INCIDENT = 'INCIDENT',
}

export enum SupportTicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum SupportTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Entity({ name: 'DeliverySupportTicket' })
export class DeliverySupportTicketEntity {
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

  @Column({ name: 'partner_id', nullable: true })
  partnerId?: string;

  @ManyToOne(() => DeliveryPartnerEntity, { nullable: true })
  @JoinColumn({ name: 'partner_id' })
  partner?: DeliveryPartnerEntity;

  @Column({ name: 'assignment_id', nullable: true })
  assignmentId?: string;

  @Column({ name: 'order_id', nullable: true })
  orderId?: string;

  @Column({ name: 'ticket_type', type: 'enum', enum: SupportTicketType })
  ticketType: SupportTicketType;

  @Column({
    type: 'enum',
    enum: SupportTicketPriority,
    default: SupportTicketPriority.MEDIUM,
  })
  priority: SupportTicketPriority;

  @Column({ type: 'enum', enum: SupportTicketStatus, default: SupportTicketStatus.OPEN })
  status: SupportTicketStatus;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'sos_latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  sosLatitude?: number;

  @Column({ name: 'sos_longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  sosLongitude?: number;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes?: string;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
