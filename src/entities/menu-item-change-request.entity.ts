import { randomUUID } from 'crypto';
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BranchEntity } from './branch.entity';
import { MenuItemEntity } from './menu-item.entity';

export enum MenuItemChangeRequestStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

@Entity({ name: 'menu_item_change_requests' })
export class MenuItemChangeRequestEntity {
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

  @ManyToOne(() => MenuItemEntity, { nullable: false })
  @JoinColumn({ name: 'item_id' })
  item: MenuItemEntity;

  @ManyToOne(() => BranchEntity, { nullable: false })
  @JoinColumn({ name: 'branch_id' })
  branch: BranchEntity;

  @Column({ name: 'restaurant_id', type: 'text' })
  restaurantId: string;

  @Column({ name: 'requested_by', type: 'text', nullable: true })
  requestedBy?: string;

  @Column({ type: 'enum', enum: MenuItemChangeRequestStatus, default: MenuItemChangeRequestStatus.Pending })
  status: MenuItemChangeRequestStatus;

  @Column({ name: 'change_description', type: 'text' })
  changeDescription: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment?: string;

  @Column({ name: 'reviewed_by', type: 'text', nullable: true })
  reviewedBy?: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
