import { randomUUID } from 'crypto';
import { BeforeInsert, BeforeUpdate, Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { BranchEntity } from './branch.entity';
import { MenuCategoryEntity } from './menu-category.entity';
import { MenuAddonEntity } from './menu-addon.entity';
import { MenuPricingRuleEntity } from './menu-pricing-rule.entity';

@Entity({ name: 'MenuItem' })
export class MenuItemEntity {
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

  @ManyToOne(() => BranchEntity, { nullable: false })
  branch: BranchEntity;

  @ManyToOne(() => MenuCategoryEntity, (category) => category.items, { nullable: false })
  category: MenuCategoryEntity;

  @Column({ nullable: true })
  sku: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('numeric')
  price: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ name: 'stock_on_hand', type: 'int', default: 0 })
  stockOnHand: number;

  @Column({ name: 'stock_threshold', type: 'int', default: 0 })
  stockThreshold: number;

  @Column({ name: 'auto_out_of_stock', default: true })
  autoOutOfStock: boolean;

  @Column({ name: 'min_order_quantity', type: 'int', default: 1 })
  minOrderQuantity: number;

  @Column({ name: 'max_order_quantity', type: 'int', default: 0 })
  maxOrderQuantity: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_visible', default: true })
  isVisible: boolean;

  @Column({ name: 'is_in_stock', default: true })
  isInStock: boolean;

  @OneToMany(() => MenuAddonEntity, (addon) => addon.item)
  addons: MenuAddonEntity[];

  @OneToMany(() => MenuPricingRuleEntity, (rule) => rule.item)
  pricingRules: MenuPricingRuleEntity[];

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
