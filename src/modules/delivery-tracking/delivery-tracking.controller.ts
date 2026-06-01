import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DeliveryTrackingService } from './delivery-tracking.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('delivery-tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryTrackingController {
  constructor(private readonly trackingService: DeliveryTrackingService) {}

  @Post('location')
  updateLocation(@Body() payload: UpdateLocationDto) {
    return this.trackingService.updateLocation(payload);
  }

  @Get('order/:orderId')
  getByOrder(@Param('orderId') orderId: string) {
    return this.trackingService.getTrackingByOrder(orderId);
  }

  @Get('rider/:riderId')
  getByRider(@Param('riderId') riderId: string) {
    return this.trackingService.getTrackingByRider(riderId);
  }

  @Get('rider/:riderId/history')
  getLocationHistory(
    @Param('riderId') riderId: string,
    @Query('assignmentId') assignmentId?: string,
  ) {
    return this.trackingService.getLocationHistory(riderId, assignmentId);
  }

  @Get('active-riders')
  @Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  getActiveRiders() {
    return this.trackingService.getActiveRiders();
  }
}
