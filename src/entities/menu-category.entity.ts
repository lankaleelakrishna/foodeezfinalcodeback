import { randomUUID } from 'crypto';
import { BeforeInsert, BeforeUpdate, Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { BranchEntity } from './branch.entity';
import { MenuItemEntity } from './menu-item.entity';

@Entity({ name: 'MenuCategory' })
export class MenuCategoryEntity {
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

  @Column()
  name: string;

  @Column({ name: 'display_name' })
  displayName: string;

  @OneToMany(() => MenuItemEntity, (item) => item.category)
  items: MenuItemEntity[];

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
