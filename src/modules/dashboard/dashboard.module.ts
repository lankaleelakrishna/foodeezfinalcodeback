import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { BranchEntity } from '../../entities/branch.entity';
import { RestaurantEntity } from '../../entities/restaurant.entity';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([BranchEntity, RestaurantEntity])],
  providers: [DashboardService, RolesGuard],
  controllers: [DashboardController],
})
export class DashboardModule {}
