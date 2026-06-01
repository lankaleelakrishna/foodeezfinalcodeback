import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('restaurants/:restaurantId/branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  create(@Param('restaurantId') restaurantId: string, @Body() payload: CreateBranchDto) {
    return this.branchesService.create(restaurantId, payload);
  }

  @Get()
  findAll(@Param('restaurantId') restaurantId: string) {
    return this.branchesService.findByRestaurant(restaurantId);
  }

  @Get(':branchId')
  findOne(@Param('branchId') branchId: string) {
    return this.branchesService.findOne(branchId);
  }

  @Patch(':branchId')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  update(@Param('branchId') branchId: string, @Body() payload: UpdateBranchDto) {
    return this.branchesService.update(branchId, payload);
  }
}
