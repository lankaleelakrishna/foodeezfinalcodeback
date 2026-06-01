import { randomUUID } from 'crypto';
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DeliveryPartnerEntity } from './delivery-partner.entity';

@Entity({ name: 'DeliveryTracking' })
export class DeliveryTrackingEntity {
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

  @Column({ name: 'partner_id' })
  partnerId: string;

  @ManyToOne(() => DeliveryPartnerEntity)
  @JoinColumn({ name: 'partner_id' })
  partner: DeliveryPartnerEntity;

  @Column({ name: 'assignment_id', nullable: true })
  assignmentId?: string;

  @Column({ name: 'order_id', nullable: true })
  orderId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  speed?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  heading?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  accuracy?: number;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
