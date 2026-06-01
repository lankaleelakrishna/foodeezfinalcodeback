import { Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { PaymentAnalysisService } from './payment-analysis.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin)
@Controller('payment-analysis')
export class PaymentAnalysisController {
  constructor(private readonly paymentAnalysisService: PaymentAnalysisService) {}

  @Post()
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.paymentAnalysisService.createPayment(dto);
  }

  @Get()
  listPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.paymentAnalysisService.listPayments(page, limit);
  }

  @Get('summary')
  getSummary() {
    return this.paymentAnalysisService.getSummary();
  }

  @Get('daily')
  getDaily(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number,
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1), ParseIntPipe) month: number,
  ) {
    return this.paymentAnalysisService.getDaily(year, month);
  }

  @Get('weekly')
  getWeekly(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number,
    @Query('quarter', new DefaultValuePipe(0), ParseIntPipe) quarter: number,
  ) {
    return this.paymentAnalysisService.getWeekly(year, quarter || undefined);
  }

  @Get('monthly')
  getMonthly(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number,
  ) {
    return this.paymentAnalysisService.getMonthly(year);
  }

  @Get('quarterly')
  getQuarterly(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number,
  ) {
    return this.paymentAnalysisService.getQuarterly(year);
  }
}
