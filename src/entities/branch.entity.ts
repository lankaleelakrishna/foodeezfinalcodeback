import { randomUUID } from 'crypto';
import { BeforeInsert, BeforeUpdate, Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { RestaurantEntity } from './restaurant.entity';

@Entity({ name: 'Branch' })
export class BranchEntity {
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

  @ManyToOne(() => RestaurantEntity, { nullable: false })
  restaurant: RestaurantEntity;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column({ name: 'zip_code' })
  zipCode: string;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ name: 'opening_time', nullable: true })
  openingTime: string;

  @Column({ name: 'closing_time', nullable: true })
  closingTime: string;

  @Column({ name: 'delivery_radius_km', type: 'numeric', nullable: true })
  deliveryRadiusKm?: number;

  @Column({ name: 'busy_mode', default: false })
  busyMode: boolean;

  @Column({ name: 'max_orders_per_hour', type: 'int', default: 0 })
  maxOrdersPerHour: number;

  @Column({ name: 'temporary_closure', default: false })
  temporaryClosure: boolean;

  @Column({ name: 'closure_reason', nullable: true })
  closureReason?: string;

  @Column({ name: 'is_online', default: false })
  isOnline: boolean;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
