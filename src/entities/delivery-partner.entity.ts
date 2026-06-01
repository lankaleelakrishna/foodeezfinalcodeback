import { randomUUID } from 'crypto';
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { DeliveryAssignmentEntity } from './delivery-assignment.entity';
import { DeliveryPayoutEntity } from './delivery-payout.entity';

export enum DeliveryPartnerStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum VehicleType {
  BICYCLE = 'BICYCLE',
  MOTORCYCLE = 'MOTORCYCLE',
  CAR = 'CAR',
  SCOOTER = 'SCOOTER',
  ELECTRIC_SCOOTER = 'ELECTRIC_SCOOTER',
}

@Entity({ name: 'DeliveryPartner' })
export class DeliveryPartnerEntity {
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

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ name: 'profile_photo', nullable: true })
  profilePhoto?: string;

  @Column({
    type: 'enum',
    enum: DeliveryPartnerStatus,
    default: DeliveryPartnerStatus.PENDING,
  })
  status: DeliveryPartnerStatus;

  @Column({ name: 'is_online', default: false })
  isOnline: boolean;

  @Column({ name: 'is_available', default: false })
  isAvailable: boolean;

  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType })
  vehicleType: VehicleType;

  @Column({ name: 'vehicle_number' })
  vehicleNumber: string;

  @Column({ name: 'vehicle_model', nullable: true })
  vehicleModel?: string;

  @Column({ name: 'license_number' })
  licenseNumber: string;

  @Column({ name: 'aadhar_number', nullable: true })
  aadharNumber?: string;

  @Column({ name: 'pan_number', nullable: true })
  panNumber?: string;

  @Column({ name: 'bank_account_number', nullable: true })
  bankAccountNumber?: string;

  @Column({ name: 'bank_ifsc_code', nullable: true })
  bankIfscCode?: string;

  @Column({ name: 'bank_name', nullable: true })
  bankName?: string;

  @Column({ name: 'current_latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLatitude?: number;

  @Column({ name: 'current_longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLongitude?: number;

  @Column({ name: 'rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'total_ratings', default: 0 })
  totalRatings: number;

  @Column({ name: 'total_deliveries', default: 0 })
  totalDeliveries: number;

  @Column({ name: 'total_earnings', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash?: string;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => DeliveryAssignmentEntity, (a) => a.partner)
  assignments: DeliveryAssignmentEntity[];

  @OneToMany(() => DeliveryPayoutEntity, (p) => p.partner)
  payouts: DeliveryPayoutEntity[];
}
