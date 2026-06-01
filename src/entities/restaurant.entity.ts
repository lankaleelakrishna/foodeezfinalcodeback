import { randomUUID } from 'crypto';
import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryColumn } from 'typeorm';

export enum LeadStatus {
  Interested = 'INTERESTED',
  Registered = 'REGISTERED',
  Activated = 'ACTIVATED',
  Review = 'REVIEW',
  Rejected = 'REJECTED',
}

export enum AgreementMethod {
  ESign = 'E_SIGN',
  OTP = 'OTP',
  Offline = 'OFFLINE',
}

export enum AccountType {
  Savings = 'SAVINGS',
  Current = 'CURRENT',
}

@Entity({ name: 'Restaurant' })
export class RestaurantEntity {
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

  @Column({ name: 'owner_name' })
  ownerName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ name: 'zip_code', nullable: true })
  zipCode?: string;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ name: 'gst_number', nullable: true })
  gstNumber?: string;

  @Column({ name: 'fssai_number', nullable: true })
  fssaiNumber?: string;

  @Column({ name: 'bank_name', nullable: true })
  bankName?: string;

  @Column({ name: 'bank_account_number', nullable: true })
  bankAccountNumber?: string;

  @Column({ name: 'bank_account_holder_name', nullable: true })
  bankAccountHolderName?: string;

  @Column({ name: 'account_type', nullable: true })
  accountType?: AccountType;

  @Column({ name: 'pan_number', nullable: true })
  panNumber?: string;

  @Column({ name: 'legal_entity', nullable: true })
  legalEntity?: string;

  @Column({ name: 'front_photo', nullable: true })
  frontPhoto?: string;

  @Column({ name: 'cover_photo', nullable: true })
  coverPhoto?: string;

  @Column({ name: 'ifsc_code', nullable: true })
  ifscCode?: string;

  @Column({ name: 'lead_status', type: 'enum', enum: LeadStatus, default: LeadStatus.Interested })
  leadStatus: LeadStatus;

  @Column({ name: 'lead_source', nullable: true })
  leadSource?: string;

  @Column({ name: 'riskScore', type: 'numeric', default: 0 })
  riskScore: number;

  @Column({ name: 'agreement_signed', default: false })
  agreementSigned: boolean;

  @Column({ name: 'agreement_method', type: 'enum', enum: AgreementMethod, nullable: true })
  agreementMethod?: AgreementMethod;

  @Column({ name: 'agreement_signed_at', type: 'timestamptz', nullable: true })
  agreementSignedAt?: Date;

  @Column({ name: 'store_photos', type: 'jsonb', nullable: true })
  storePhotos?: string[];

  @Column({ name: 'brand_description', type: 'text', nullable: true })
  brandDescription?: string;

  @Column({ name: 'extracted_menu', type: 'jsonb', nullable: true })
  extractedMenu?: any;

  @Column({ name: 'cuisine_tags', type: 'text', array: true, nullable: true })
  cuisineTags?: string[];

  @Column({ name: 'service_radius_km', type: 'numeric', nullable: true })
  serviceRadiusKm?: number;

  @Column({ name: 'delivery_zones', type: 'jsonb', nullable: true })
  deliveryZones?: Record<string, any>;

  @Column({ name: 'temporary_closure', default: false })
  temporaryClosure: boolean;

  @Column({ name: 'holiday_mode', default: false })
  holidayMode: boolean;

  @Column({ name: 'gst_expiry_date', type: 'timestamptz', nullable: true })
  gstExpiryDate?: Date;

  @Column({ name: 'fssai_expiry_date', type: 'timestamptz', nullable: true })
  fssaiExpiryDate?: Date;

  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'onboarding_step', default: 1 })
  onboardingStep: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
