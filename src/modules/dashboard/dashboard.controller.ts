import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(
    UserRole.RestaurantAdmin,
    UserRole.RestaurantOwner,
    UserRole.RestaurantManager,
    UserRole.RestaurantStaff,
    UserRole.SalesOperator,
    UserRole.SuperAdmin,
  )
  getDashboard(@CurrentUser() user: { id: string; role: string; restaurant: { id: string } | null }) {
    const isAdmin = user.role === UserRole.SuperAdmin || user.role === UserRole.SalesOperator;
    if (isAdmin) {
      return this.dashboardService.getAdminSummary();
    }
    if (!user.restaurant?.id) {
      return { restaurantId: null, message: 'No restaurant assigned to your account yet.' };
    }
    return this.dashboardService.getRestaurantSummary(user.restaurant.id);
  }
}
