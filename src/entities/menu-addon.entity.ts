import { randomUUID } from 'crypto';
import { BeforeInsert, BeforeUpdate, Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { MenuItemEntity } from './menu-item.entity';
import { BranchEntity } from './branch.entity';

@Entity({ name: 'MenuAddon' })
export class MenuAddonEntity {
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

  @ManyToOne(() => MenuItemEntity, (item) => item.addons, { nullable: false })
  item: MenuItemEntity;

  @ManyToOne(() => BranchEntity, { nullable: false })
  branch: BranchEntity;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('numeric')
  price: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ name: 'min_selections', type: 'int', default: 0 })
  minSelections: number;

  @Column({ name: 'max_selections', type: 'int', default: 0 })
  maxSelections: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_visible', default: true })
  isVisible: boolean;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
