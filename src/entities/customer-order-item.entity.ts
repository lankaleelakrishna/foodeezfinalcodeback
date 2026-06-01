import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { CustomerOrderEntity } from './customer-order.entity';

@Entity({ name: 'customer_order_items' })
export class CustomerOrderItemEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ name: 'order_id', type: 'text' })
  orderId: string;

  @ManyToOne(() => CustomerOrderEntity, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: CustomerOrderEntity;

  @Column({ name: 'menu_item_id', type: 'text' })
  menuItemId: string;

  @Column()
  name: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

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
