import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeliverySupportService } from './delivery-support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateSosDto } from './dto/create-sos.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { SupportTicketStatus, SupportTicketType } from '../../entities/delivery-support-ticket.entity';

@Controller('delivery-support')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliverySupportController {
  constructor(private readonly supportService: DeliverySupportService) {}

  @Post('sos')
  createSos(@Body() payload: CreateSosDto) {
    return this.supportService.createSos(payload);
  }

  @Post('ticket')
  createTicket(@Body() payload: CreateTicketDto) {
    return this.supportService.createTicket(payload);
  }

  @Get('tickets')
  @Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: SupportTicketStatus,
    @Query('type') type?: SupportTicketType,
  ) {
    return this.supportService.findAll(+page, +limit, status, type);
  }

  @Get('tickets/sos')
  @Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  getSosAlerts() {
    return this.supportService.getOpenSosAlerts();
  }

  @Get('tickets/:id')
  findOne(@Param('id') id: string) {
    return this.supportService.findOne(id);
  }

  @Get('tickets/partner/:partnerId')
  findByPartner(
    @Param('partnerId') partnerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.supportService.findByPartner(partnerId, +page, +limit);
  }

  @Patch('tickets/:id')
  @Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  updateTicket(@Param('id') id: string, @Body() payload: UpdateTicketDto) {
    return this.supportService.updateTicket(id, payload);
  }
}
