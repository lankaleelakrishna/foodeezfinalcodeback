import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DeliveryPartnerEntity } from './delivery-partner.entity';

@Entity({ name: 'DeliveryLocationHistory' })
export class DeliveryLocationHistoryEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
    this.recordedAt = new Date();
  }

  @Column({ name: 'partner_id' })
  partnerId: string;

  @ManyToOne(() => DeliveryPartnerEntity)
  @JoinColumn({ name: 'partner_id' })
  partner: DeliveryPartnerEntity;

  @Column({ name: 'assignment_id', nullable: true })
  assignmentId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  speed?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  heading?: number;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;
}
