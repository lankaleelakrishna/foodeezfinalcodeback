import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CustomerPaymentsService } from './customer-payments.service';
import { CustomerJwtGuard } from '../customer-auth/guards/customer-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerJwtPayload } from '../customer-auth/strategies/customer-jwt.strategy';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { AddWalletMoneyDto } from './dto/add-wallet-money.dto';

@Controller('customer/payments')
export class CustomerPaymentsController {
  constructor(private readonly paymentsService: CustomerPaymentsService) {}

  @Post('initiate')
  @UseGuards(CustomerJwtGuard)
  initiatePayment(@CurrentUser() c: CustomerJwtPayload, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(c.sub, dto);
  }

  @Post('verify')
  @UseGuards(CustomerJwtGuard)
  @HttpCode(HttpStatus.OK)
  verifyPayment(@CurrentUser() c: CustomerJwtPayload, @Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(c.sub, dto);
  }

  @Post('webhook/razorpay')
  @HttpCode(HttpStatus.OK)
  razorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleRazorpayWebhook(req.rawBody ?? Buffer.from(''), signature);
  }

  @Get('wallet')
  @UseGuards(CustomerJwtGuard)
  getWallet(@CurrentUser() c: CustomerJwtPayload) {
    return this.paymentsService.getWallet(c.sub);
  }

  @Get('wallet/transactions')
  @UseGuards(CustomerJwtGuard)
  getTransactions(
    @CurrentUser() c: CustomerJwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.paymentsService.getWalletTransactions(c.sub, page, limit);
  }

  @Post('wallet/topup/initiate')
  @UseGuards(CustomerJwtGuard)
  initiateTopup(@CurrentUser() c: CustomerJwtPayload, @Body() dto: AddWalletMoneyDto) {
    return this.paymentsService.initiateWalletTopup(c.sub, dto);
  }
}
