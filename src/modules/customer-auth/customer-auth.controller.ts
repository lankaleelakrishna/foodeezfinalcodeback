import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { SendOtpDto } from './dto/send-otp.dto';
import { CustomerSignupDto } from './dto/customer-signup.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CustomerJwtPayload } from './strategies/customer-jwt.strategy';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('customer/auth')
export class CustomerAuthController {
  constructor(private readonly authService: CustomerAuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('signup')
  signup(@Body() dto: CustomerSignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: CustomerLoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Post('logout')
  @UseGuards(CustomerJwtGuard)
  @HttpCode(HttpStatus.OK)
  logout(
    @CurrentUser() customer: CustomerJwtPayload,
    @Body('deviceId') deviceId: string,
  ) {
    return this.authService.logout(customer.sub, deviceId ?? 'default');
  }

  @Post('logout-all')
  @UseGuards(CustomerJwtGuard)
  @HttpCode(HttpStatus.OK)
  logoutAll(@CurrentUser() customer: CustomerJwtPayload) {
    return this.authService.logoutAllDevices(customer.sub);
  }

  @Get('sessions')
  @UseGuards(CustomerJwtGuard)
  getSessions(@CurrentUser() customer: CustomerJwtPayload) {
    return this.authService.getSessions(customer.sub);
  }

  @Delete('sessions/:deviceId')
  @UseGuards(CustomerJwtGuard)
  revokeSession(
    @CurrentUser() customer: CustomerJwtPayload,
    @Param('deviceId') deviceId: string,
  ) {
    return this.authService.logout(customer.sub, deviceId);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
