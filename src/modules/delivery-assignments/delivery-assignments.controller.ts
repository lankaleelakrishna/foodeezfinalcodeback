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
import { DeliveryAssignmentsService } from './delivery-assignments.service';
import { AutoAssignDto } from './dto/auto-assign.dto';
import { ManualAssignDto } from './dto/manual-assign.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { ReassignDto } from './dto/reassign.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('delivery-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryAssignmentsController {
  constructor(private readonly assignmentsService: DeliveryAssignmentsService) {}

  @Post('assign')
  @Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  autoAssign(@Body() payload: AutoAssignDto) {
    return this.assignmentsService.autoAssign(payload);
  }

  @Post('manual')
  @Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  manualAssign(@Body() payload: ManualAssignDto) {
    return this.assignmentsService.manualAssign(payload);
  }

  @Get('pending')
  @Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  findPending() {
    return this.assignmentsService.findPending();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Get('order/:orderId')
  findByOrder(@Param('orderId') orderId: string) {
    return this.assignmentsService.findByOrder(orderId);
  }

  @Get('partner/:partnerId')
  findByPartner(
    @Param('partnerId') partnerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.assignmentsService.findByPartner(partnerId, +page, +limit);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() payload: UpdateAssignmentStatusDto) {
    return this.assignmentsService.updateStatus(id, payload);
  }

  @Patch(':id/reassign')
  @Roles(UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  reassign(@Param('id') id: string, @Body() payload: ReassignDto) {
    return this.assignmentsService.reassign(id, payload);
  }
}
