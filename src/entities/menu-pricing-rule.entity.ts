import { randomUUID } from 'crypto';
import { BeforeInsert, BeforeUpdate, Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { MenuItemEntity } from './menu-item.entity';
import { BranchEntity } from './branch.entity';

export enum MenuPricingRuleType {
  Discount = 'DISCOUNT',
  PriceOverride = 'PRICE_OVERRIDE',
  TimeBased = 'TIME_BASED',
}

export enum MenuPricingValueType {
  Percentage = 'PERCENTAGE',
  Flat = 'FLAT',
}

@Entity({ name: 'MenuPricingRule' })
export class MenuPricingRuleEntity {
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

  @ManyToOne(() => MenuItemEntity, (item) => item.pricingRules, { nullable: false })
  item: MenuItemEntity;

  @ManyToOne(() => BranchEntity, { nullable: false })
  branch: BranchEntity;

  @Column({ name: 'rule_type', type: 'enum', enum: MenuPricingRuleType })
  ruleType: MenuPricingRuleType;

  @Column({ name: 'value_type', type: 'enum', enum: MenuPricingValueType })
  valueType: MenuPricingValueType;

  @Column('numeric')
  value: number;

  @Column({ nullable: true })
  title: string;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'conditions', type: 'jsonb', nullable: true })
  conditions: Record<string, any>;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
