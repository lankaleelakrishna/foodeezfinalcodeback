import { randomUUID } from 'crypto';
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { RestaurantEntity } from './restaurant.entity';

export enum UserRole {
  SalesOperator = 'sales_operator',
  RestaurantOwner = 'restaurant_owner',
  RestaurantManager = 'restaurant_manager',
  RestaurantStaff = 'restaurant_staff',
  RestaurantAdmin = 'restaurant_admin',
  SuperAdmin = 'super_admin',
}

@Entity({ name: 'User' })
export class UserEntity {
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

  @Column({ nullable: true })
  displayName?: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.RestaurantAdmin })
  role: UserRole;

  @ManyToOne(() => RestaurantEntity, { nullable: true })
  @JoinColumn({ name: 'restaurantId' })
  restaurant?: RestaurantEntity;

  @Column({ name: 'must_change_password', default: true })
  mustChangePassword: boolean;

  @Column({ name: 'password_reset_token', nullable: true })
  passwordResetToken?: string;

  @Column({ name: 'password_reset_token_expires_at', type: 'timestamp', nullable: true })
  passwordResetTokenExpiresAt?: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
