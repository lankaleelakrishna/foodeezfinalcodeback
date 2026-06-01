import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { CustomerCartEntity } from './customer-cart.entity';

@Entity({ name: 'customer_cart_items' })
export class CustomerCartItemEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ name: 'cart_id', type: 'text' })
  cartId: string;

  @ManyToOne(() => CustomerCartEntity, (c) => c.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: CustomerCartEntity;

  @Column({ name: 'menu_item_id', type: 'text' })
  menuItemId: string;

  @Column({ name: 'menu_item_name' })
  menuItemName: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'selected_addons', type: 'jsonb', nullable: true })
  selectedAddons?: Record<string, any>[];

  @Column({ name: 'item_total', type: 'decimal', precision: 10, scale: 2 })
  itemTotal: number;

  @Column({ name: 'special_note', nullable: true })
  specialNote?: string;
}
