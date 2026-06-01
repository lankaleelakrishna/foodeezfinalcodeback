import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { RegistrationScanController } from './registration-scan.controller';
import { MenuScanService } from './scan/menu-scan.service';
import { MenuCategoryEntity } from '../../entities/menu-category.entity';
import { MenuItemEntity } from '../../entities/menu-item.entity';
import { MenuItemChangeRequestEntity } from '../../entities/menu-item-change-request.entity';
import { BranchEntity } from '../../entities/branch.entity';
import { MenuAddonEntity } from '../../entities/menu-addon.entity';
import { MenuPricingRuleEntity } from '../../entities/menu-pricing-rule.entity';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([MenuCategoryEntity, MenuItemEntity, MenuAddonEntity, MenuPricingRuleEntity, MenuItemChangeRequestEntity, BranchEntity])],
  providers: [MenusService, MenuScanService, RolesGuard],
  controllers: [MenusController, RegistrationScanController],
  exports: [MenuScanService],
})
export class MenusModule {}
