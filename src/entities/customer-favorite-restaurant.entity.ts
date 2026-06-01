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

@Entity({ name: 'customer_favorite_restaurants' })
@Unique(['customerId', 'restaurantId'])
export class CustomerFavoriteRestaurantEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
    if (!this.createdAt) this.createdAt = new Date();
  }

  @Column({ name: 'customer_id', type: 'text' })
  customerId: string;

  @ManyToOne(() => CustomerEntity, (c) => c.favoriteRestaurants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity;

  @Column({ name: 'restaurant_id', type: 'text' })
  restaurantId: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
