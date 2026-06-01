import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { BranchEntity } from '../../entities/branch.entity';
import { RestaurantEntity } from '../../entities/restaurant.entity';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([BranchEntity, RestaurantEntity])],
  providers: [BranchesService, RolesGuard],
  controllers: [BranchesController],
  exports: [BranchesService],
})
export class BranchesModule {}
