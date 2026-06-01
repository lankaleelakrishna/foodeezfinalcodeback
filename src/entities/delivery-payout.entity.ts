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

export enum PayoutType {
  DELIVERY_FEE = 'DELIVERY_FEE',
  INCENTIVE = 'INCENTIVE',
  BONUS = 'BONUS',
  PENALTY = 'PENALTY',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

@Entity({ name: 'DeliveryPayout' })
export class DeliveryPayoutEntity {
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

  @Column({ name: 'partner_id' })
  partnerId: string;

  @ManyToOne(() => DeliveryPartnerEntity, (p) => p.payouts)
  @JoinColumn({ name: 'partner_id' })
  partner: DeliveryPartnerEntity;

  @Column({ name: 'assignment_id', nullable: true })
  assignmentId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'payout_type', type: 'enum', enum: PayoutType })
  payoutType: PayoutType;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'period_start', type: 'timestamptz', nullable: true })
  periodStart?: Date;

  @Column({ name: 'period_end', type: 'timestamptz', nullable: true })
  periodEnd?: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId?: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
