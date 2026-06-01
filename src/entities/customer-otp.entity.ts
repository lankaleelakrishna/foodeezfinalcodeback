import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';

export enum OtpPurpose {
  SIGNUP = 'SIGNUP',
  LOGIN = 'LOGIN',
  RESET_PASSWORD = 'RESET_PASSWORD',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
}

@Entity({ name: 'customer_otps' })
export class CustomerOtpEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = randomUUID();
    }

    if (!this.createdAt) {
      this.createdAt = new Date();
    }
  }

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  email?: string;

  @Column({ type: 'text', name: 'otp_hash' })
  otpHash: string;

  @Column({
    type: 'enum',
    enum: OtpPurpose,
  })
  purpose: OtpPurpose;

  @Column({
    type: 'boolean',
    name: 'is_used',
    default: false,
  })
  isUsed: boolean;

  @Column({
    type: 'int',
    name: 'attempt_count',
    default: 0,
  })
  attemptCount: number;

  @Column({
    type: 'timestamptz',
    name: 'expires_at',
  })
  expiresAt: Date;

  @Column({
    type: 'timestamptz',
    name: 'created_at',
  })
  createdAt: Date;
}