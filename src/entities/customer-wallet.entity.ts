import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';
import { CustomerWalletTransactionEntity } from './customer-wallet-transaction.entity';

@Entity({ name: 'customer_wallets' })
export class CustomerWalletEntity {
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

  @Column({ name: 'customer_id', type: 'text', unique: true })
  customerId: string;

  @OneToOne(() => CustomerEntity, (c) => c.wallet)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ name: 'cashback_balance', type: 'decimal', precision: 10, scale: 2, default: 0 })
  cashbackBalance: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => CustomerWalletTransactionEntity, (t) => t.wallet)
  transactions: CustomerWalletTransactionEntity[];

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
