import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerDiscoveryService } from './customer-discovery.service';
import { CustomerDiscoveryController } from './customer-discovery.controller';
import { BranchEntity } from '../../entities/branch.entity';
import { MenuItemEntity } from '../../entities/menu-item.entity';
import { MenuCategoryEntity } from '../../entities/menu-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BranchEntity, MenuItemEntity, MenuCategoryEntity]),
  ],
  providers: [CustomerDiscoveryService],
  controllers: [CustomerDiscoveryController],
  exports: [CustomerDiscoveryService],
})
export class CustomerDiscoveryModule {}
