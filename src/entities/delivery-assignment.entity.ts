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

export enum DeliveryStatus {
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  PICKED_UP = 'PICKED_UP',
  ON_THE_WAY = 'ON_THE_WAY',
  ARRIVED = 'ARRIVED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum AssignmentType {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

@Entity({ name: 'DeliveryAssignment' })
export class DeliveryAssignmentEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
    const now = new Date();
    if (!this.createdAt) this.createdAt = now;
    this.updatedAt = now;
    this.assignedAt = now;
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'partner_id' })
  partnerId: string;

  @ManyToOne(() => DeliveryPartnerEntity, (p) => p.assignments)
  @JoinColumn({ name: 'partner_id' })
  partner: DeliveryPartnerEntity;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Column({ name: 'branch_id', nullable: true })
  branchId?: string;

  @Column({ name: 'restaurant_latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  restaurantLatitude?: number;

  @Column({ name: 'restaurant_longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  restaurantLongitude?: number;

  @Column({ name: 'customer_latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  customerLatitude?: number;

  @Column({ name: 'customer_longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  customerLongitude?: number;

  @Column({ name: 'customer_address', nullable: true })
  customerAddress?: string;

  @Column({
    name: 'assignment_type',
    type: 'enum',
    enum: AssignmentType,
    default: AssignmentType.AUTO,
  })
  assignmentType: AssignmentType;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.ASSIGNED })
  status: DeliveryStatus;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt?: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date;

  @Column({ name: 'picked_up_at', type: 'timestamptz', nullable: true })
  pickedUpAt?: Date;

  @Column({ name: 'on_the_way_at', type: 'timestamptz', nullable: true })
  onTheWayAt?: Date;

  @Column({ name: 'arrived_at', type: 'timestamptz', nullable: true })
  arrivedAt?: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', nullable: true })
  cancellationReason?: string;

  @Column({
    name: 'estimated_distance_km',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  estimatedDistanceKm?: number;

  @Column({ name: 'estimated_duration_mins', nullable: true })
  estimatedDurationMins?: number;

  @Column({ name: 'actual_duration_mins', nullable: true })
  actualDurationMins?: number;

  @Column({ name: 'delivery_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
