import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { CustomerWalletEntity } from './customer-wallet.entity';

export enum WalletTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  REFUND_CREDIT = 'REFUND_CREDIT',
  CASHBACK_CREDIT = 'CASHBACK_CREDIT',
  REFERRAL_CREDIT = 'REFERRAL_CREDIT',
  TOPUP = 'TOPUP',
}

@Entity({ name: 'customer_wallet_transactions' })
export class CustomerWalletTransactionEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
    if (!this.createdAt) this.createdAt = new Date();
  }

  @Column({ name: 'wallet_id', type: 'text' })
  walletId: string;

  @ManyToOne(() => CustomerWalletEntity, (w) => w.transactions)
  @JoinColumn({ name: 'wallet_id' })
  wallet: CustomerWalletEntity;

  @Column({ type: 'enum', enum: WalletTransactionType })
  type: WalletTransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'balance_after', type: 'decimal', precision: 10, scale: 2 })
  balanceAfter: number;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId?: string;

  @Column({ name: 'reference_type', nullable: true })
  referenceType?: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
