import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'customer_reviews' })
export class CustomerReviewEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) this.id = randomUUID();
    if (!this.createdAt) this.createdAt = new Date();
  }

  @Column({ name: 'customer_id', type: 'text' })
  customerId: string;

  @Column({ name: 'order_id', type: 'text', unique: true })
  orderId: string;

  @Column({ name: 'restaurant_id', type: 'text' })
  restaurantId: string;

  @Column({ name: 'delivery_partner_id', type: 'text', nullable: true })
  deliveryPartnerId?: string;

  @Column({ name: 'restaurant_rating', type: 'decimal', precision: 2, scale: 1 })
  restaurantRating: number;

  @Column({ name: 'delivery_rating', type: 'decimal', precision: 2, scale: 1, nullable: true })
  deliveryRating?: number;

  @Column({ name: 'food_rating', type: 'decimal', precision: 2, scale: 1, nullable: true })
  foodRating?: number;

  @Column({ name: 'review_text', type: 'text', nullable: true })
  reviewText?: string;

  @Column({ name: 'image_urls', type: 'jsonb', nullable: true })
  imageUrls?: string[];

  @Column({ name: 'helpful_count', type: 'int', default: 0 })
  helpfulCount: number;

  @Column({ name: 'is_approved', default: false })
  isApproved: boolean;

  @Column({ name: 'is_anonymous', default: false })
  isAnonymous: boolean;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
