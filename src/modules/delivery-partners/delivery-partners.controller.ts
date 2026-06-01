import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeliveryPartnersService } from './delivery-partners.service';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto';
import { UpdateDeliveryPartnerDto } from './dto/update-delivery-partner.dto';
import { UpdatePartnerStatusDto } from './dto/update-partner-status.dto';
import { RatePartnerDto } from './dto/rate-partner.dto';
import { ToggleOnlineStatusDto } from './dto/toggle-online-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { DeliveryPartnerStatus } from '../../entities/delivery-partner.entity';

@Controller('delivery-partners')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryPartnersController {
  constructor(private readonly partnersService: DeliveryPartnersService) {}

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.SalesOperator)
  create(@Body() payload: CreateDeliveryPartnerDto) {
    return this.partnersService.create(payload);
  }

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: DeliveryPartnerStatus,
  ) {
    return this.partnersService.findAll(+page, +limit, status);
  }

  @Get(':id')
  @Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  findOne(@Param('id') id: string) {
    return this.partnersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  update(@Param('id') id: string, @Body() payload: UpdateDeliveryPartnerDto) {
    return this.partnersService.update(id, payload);
  }

  @Patch(':id/status')
  @Roles(UserRole.SuperAdmin)
  updateStatus(@Param('id') id: string, @Body() payload: UpdatePartnerStatusDto) {
    return this.partnersService.updateStatus(id, payload);
  }

  @Patch(':id/online-status')
  toggleOnlineStatus(@Param('id') id: string, @Body() payload: ToggleOnlineStatusDto) {
    return this.partnersService.toggleOnlineStatus(id, payload.isOnline);
  }

  @Post(':id/rate')
  ratePartner(@Param('id') id: string, @Body() payload: RatePartnerDto) {
    return this.partnersService.ratePartner(id, payload);
  }

  @Get(':id/earnings')
  getEarnings(@Param('id') id: string) {
    return this.partnersService.getEarnings(id);
  }

  @Delete(':id')
  @Roles(UserRole.SuperAdmin)
  remove(@Param('id') id: string) {
    return this.partnersService.softDelete(id);
  }
}
