import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DeliveryAnalyticsService } from './delivery-analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('delivery-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
export class DeliveryAnalyticsController {
  constructor(private readonly analyticsService: DeliveryAnalyticsService) {}

  @Get('overview')
  getOverview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getOverview(from, to);
  }

  @Get('riders')
  getRiderPerformance(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.analyticsService.getRiderPerformance(+page, +limit);
  }

  @Get('orders')
  getOrderAnalytics(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getOrderAnalytics(from, to);
  }

  @Get('earnings')
  getEarningsAnalytics(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getEarningsAnalytics(from, to);
  }
}
