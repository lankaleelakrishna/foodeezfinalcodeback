import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { CustomerAddressEntity } from './customer-address.entity';
import { CustomerSessionEntity } from './customer-session.entity';
import { CustomerOrderEntity } from './customer-order.entity';
import { CustomerWalletEntity } from './customer-wallet.entity';
import { CustomerFavoriteRestaurantEntity } from './customer-favorite-restaurant.entity';
import { CustomerFavoriteItemEntity } from './customer-favorite-item.entity';

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export enum CustomerTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

@Entity({ name: 'customers' })
export class CustomerEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
    if (!this.referralCode) this.referralCode = this.generateReferralCode();
    const now = new Date();
    if (!this.createdAt) this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ name: 'profile_image', nullable: true })
  profileImage?: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: string;

  @Column({ nullable: true, length: 1 })
  gender?: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash?: string;

  @Column({ name: 'referral_code', nullable: true, unique: true })
  referralCode?: string;

  @Column({ name: 'referred_by_code', nullable: true })
  referredByCode?: string;

  @Column({ type: 'enum', enum: CustomerStatus, default: CustomerStatus.ACTIVE })
  status: CustomerStatus;

  @Column({ type: 'enum', enum: CustomerTier, default: CustomerTier.BRONZE })
  tier: CustomerTier;

  @Column({ name: 'is_phone_verified', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'fcm_token', nullable: true })
  fcmToken?: string;

  @Column({ name: 'total_orders', type: 'int', default: 0 })
  totalOrders: number;

  @Column({ name: 'total_spend', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSpend: number;

  @Column({ name: 'last_order_at', type: 'timestamptz', nullable: true })
  lastOrderAt?: Date;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => CustomerAddressEntity, (a) => a.customer)
  addresses: CustomerAddressEntity[];

  @OneToMany(() => CustomerSessionEntity, (s) => s.customer)
  sessions: CustomerSessionEntity[];

  @OneToMany(() => CustomerOrderEntity, (o) => o.customer)
  orders: CustomerOrderEntity[];

  @OneToOne(() => CustomerWalletEntity, (w) => w.customer)
  wallet: CustomerWalletEntity;

  @OneToMany(() => CustomerFavoriteRestaurantEntity, (f) => f.customer)
  favoriteRestaurants: CustomerFavoriteRestaurantEntity[];

  @OneToMany(() => CustomerFavoriteItemEntity, (f) => f.customer)
  favoriteItems: CustomerFavoriteItemEntity[];

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  private generateReferralCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
