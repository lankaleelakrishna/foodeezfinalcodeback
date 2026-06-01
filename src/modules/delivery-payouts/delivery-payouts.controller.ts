import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DeliveryPayoutsService } from './delivery-payouts.service';
import { ProcessPayoutDto } from './dto/process-payout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { PayoutStatus } from '../../entities/delivery-payout.entity';

@Controller('delivery-payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin)
export class DeliveryPayoutsController {
  constructor(private readonly payoutsService: DeliveryPayoutsService) {}

  @Post()
  create(@Body() payload: ProcessPayoutDto) {
    return this.payoutsService.create(payload);
  }

  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: PayoutStatus,
  ) {
    return this.payoutsService.findAll(+page, +limit, status);
  }

  @Get('rider/:partnerId')
  findByPartner(
    @Param('partnerId') partnerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.payoutsService.findByPartner(partnerId, +page, +limit);
  }

  @Patch(':id/process')
  processPayout(@Param('id') id: string) {
    return this.payoutsService.processPayout(id);
  }

  @Post('process/bulk')
  bulkProcess(@Query('partnerId') partnerId?: string) {
    return this.payoutsService.bulkProcessPending(partnerId);
  }
}
