import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';

@Entity({ name: 'customer_favorite_items' })
@Unique(['customerId', 'menuItemId'])
export class CustomerFavoriteItemEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
    if (!this.createdAt) this.createdAt = new Date();
  }

  @Column({ name: 'customer_id', type: 'text' })
  customerId: string;

  @ManyToOne(() => CustomerEntity, (c) => c.favoriteItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity;

  @Column({ name: 'menu_item_id', type: 'text' })
  menuItemId: string;

  @Column({ name: 'restaurant_id', type: 'text' })
  restaurantId: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
