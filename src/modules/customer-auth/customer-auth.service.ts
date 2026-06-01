import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { CustomerEntity, CustomerStatus } from '../../entities/customer.entity';
import { CustomerOtpEntity, OtpPurpose } from '../../entities/customer-otp.entity';
import { CustomerSessionEntity } from '../../entities/customer-session.entity';
import { CustomerWalletEntity } from '../../entities/customer-wallet.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { CustomerSignupDto } from './dto/customer-signup.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CustomerJwtPayload } from './strategies/customer-jwt.strategy';

@Injectable()
export class CustomerAuthService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,
    @InjectRepository(CustomerOtpEntity)
    private readonly otpRepo: Repository<CustomerOtpEntity>,
    @InjectRepository(CustomerSessionEntity)
    private readonly sessionRepo: Repository<CustomerSessionEntity>,
    @InjectRepository(CustomerWalletEntity)
    private readonly walletRepo: Repository<CustomerWalletEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    if (dto.purpose === OtpPurpose.SIGNUP && dto.email) {
      await this.otpRepo.update(
        { email: dto.email, purpose: dto.purpose, isUsed: false },
        { isUsed: true },
      );
      const record = this.otpRepo.create({
        email: dto.email,
        purpose: dto.purpose,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      await this.otpRepo.save(record);
      await this.notificationsService.sendCustomerOtpByEmail({
        email: dto.email,
        otp,
        purpose: dto.purpose,
      });
      return { message: 'OTP sent successfully' };
    }

    if (dto.purpose === OtpPurpose.LOGIN && dto.email) {
      const customer = await this.customerRepo.findOne({
        where: { email: dto.email, deletedAt: IsNull() },
      });
      // Silently succeed so we don't leak whether the email is registered
      if (!customer) return { message: 'OTP sent successfully' };

      await this.otpRepo.update(
        { phone: customer.phone, purpose: dto.purpose, isUsed: false },
        { isUsed: true },
      );
      const record = this.otpRepo.create({
        phone: customer.phone,
        purpose: dto.purpose,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      await this.otpRepo.save(record);
      await this.notificationsService.sendCustomerOtpByEmail({
        email: dto.email,
        otp,
        purpose: dto.purpose,
      });
      return { message: 'OTP sent successfully' };
    }

    // Fallback: phone-based OTP (RESET_PASSWORD and other purposes)
    await this.otpRepo.update(
      { phone: dto.phone, purpose: dto.purpose, isUsed: false },
      { isUsed: true },
    );
    const record = this.otpRepo.create({
      phone: dto.phone,
      purpose: dto.purpose,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await this.otpRepo.save(record);
    await this.notificationsService.sendCustomerOtp({
      phone: dto.phone!,
      otp,
      purpose: dto.purpose,
    });

    return { message: 'OTP sent successfully' };
  }

  async signup(dto: CustomerSignupDto): Promise<AuthTokensResponse> {
    await this.validateOtpByEmail(dto.email, dto.otp, OtpPurpose.SIGNUP);

    const existingPhone = await this.customerRepo.findOne({
      where: { phone: dto.phone, deletedAt: IsNull() },
    });
    if (existingPhone) {
      throw new ConflictException('Phone number is already registered');
    }

    const existingEmail = await this.customerRepo.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }

    const customer = this.customerRepo.create({
      phone: dto.phone,
      email: dto.email,
      name: dto.name,
      isPhoneVerified: true,
      referredByCode: dto.referralCode,
    });
    await this.customerRepo.save(customer);

    const wallet = this.walletRepo.create({ customerId: customer.id });
    await this.walletRepo.save(wallet);

    return this.issueTokens(customer, dto.deviceId ?? 'default', dto.deviceName);
  }

  async login(dto: CustomerLoginDto): Promise<AuthTokensResponse> {
    const customer = await this.customerRepo.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (!customer) {
      throw new NotFoundException('No account found for this email');
    }
    if (customer.status === CustomerStatus.BANNED) {
      throw new ForbiddenException('Account has been banned');
    }

    await this.validateOtp(customer.phone, dto.otp, OtpPurpose.LOGIN);

    customer.lastLoginAt = new Date();
    await this.customerRepo.save(customer);

    return this.issueTokens(customer, dto.deviceId ?? 'default', dto.deviceName, dto.deviceOs, dto.appVersion);
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    const session = await this.sessionRepo.findOne({
      where: { deviceId: dto.deviceId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (!session) throw new UnauthorizedException('Session not found');
    if (new Date() > session.expiresAt) {
      await this.sessionRepo.update(session.id, { isActive: false });
      throw new UnauthorizedException('Session expired, please login again');
    }

    const isValid = await bcrypt.compare(dto.refreshToken, session.refreshTokenHash);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const customer = await this.customerRepo.findOne({
      where: { id: session.customerId, deletedAt: IsNull() },
    });
    if (!customer || customer.status === CustomerStatus.BANNED) {
      throw new UnauthorizedException('Account is not accessible');
    }

    return this.issueTokens(customer, dto.deviceId);
  }

  async logout(customerId: string, deviceId: string): Promise<{ message: string }> {
    await this.sessionRepo.update({ customerId, deviceId }, { isActive: false });
    return { message: 'Logged out successfully' };
  }

  async logoutAllDevices(customerId: string): Promise<{ message: string }> {
    await this.sessionRepo.update({ customerId, isActive: true }, { isActive: false });
    return { message: 'Logged out from all devices' };
  }

  async getSessions(customerId: string): Promise<CustomerSessionEntity[]> {
    return this.sessionRepo.find({
      where: { customerId, isActive: true },
      order: { lastUsedAt: 'DESC' },
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.validateOtp(dto.phone, dto.otp, OtpPurpose.RESET_PASSWORD);

    const customer = await this.customerRepo.findOne({
      where: { phone: dto.phone, deletedAt: IsNull() },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    customer.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.customerRepo.save(customer);

    // Revoke all sessions on password change
    await this.sessionRepo.update({ customerId: customer.id }, { isActive: false });

    return { message: 'Password updated successfully' };
  }

  private async validateOtp(phone: string, otp: string, purpose: OtpPurpose): Promise<void> {
    const record = await this.otpRepo.findOne({
      where: { phone, purpose, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!record) throw new BadRequestException('OTP not found or already used');
    if (new Date() > record.expiresAt) throw new BadRequestException('OTP has expired');
    if (record.attemptCount >= 5) {
      throw new BadRequestException('Maximum OTP attempts exceeded, please request a new OTP');
    }

    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) {
      await this.otpRepo.increment({ id: record.id }, 'attemptCount', 1);
      throw new BadRequestException('Invalid OTP');
    }

    await this.otpRepo.update(record.id, { isUsed: true });
  }

  private async validateOtpByEmail(email: string, otp: string, purpose: OtpPurpose): Promise<void> {
    const record = await this.otpRepo.findOne({
      where: { email, purpose, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!record) throw new BadRequestException('OTP not found or already used');
    if (new Date() > record.expiresAt) throw new BadRequestException('OTP has expired');
    if (record.attemptCount >= 5) {
      throw new BadRequestException('Maximum OTP attempts exceeded, please request a new OTP');
    }

    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) {
      await this.otpRepo.increment({ id: record.id }, 'attemptCount', 1);
      throw new BadRequestException('Invalid OTP');
    }

    await this.otpRepo.update(record.id, { isUsed: true });
  }

  private async issueTokens(
    customer: CustomerEntity,
    deviceId: string,
    deviceName?: string,
    deviceOs?: string,
    appVersion?: string,
  ): Promise<AuthTokensResponse> {
    const payload: CustomerJwtPayload = { sub: customer.id, phone: customer.phone, role: 'customer' };

    const secret = this.configService.get<string>(
      'CUSTOMER_JWT_SECRET',
      this.configService.get<string>('JWT_SECRET', 'change-me'),
    );

    const accessToken = this.jwtService.sign(payload, { secret, expiresIn: '15m' });
    const refreshToken = randomUUID();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Upsert session — one session per device
    const existing = await this.sessionRepo.findOne({
      where: { customerId: customer.id, deviceId },
    });

    if (existing) {
      await this.sessionRepo.update(existing.id, {
        refreshTokenHash,
        isActive: true,
        expiresAt,
        lastUsedAt: new Date(),
        deviceName,
        deviceOs,
        appVersion,
      });
    } else {
      const session = this.sessionRepo.create({
        customerId: customer.id,
        deviceId,
        deviceName,
        deviceOs,
        appVersion,
        refreshTokenHash,
        isActive: true,
        expiresAt,
        lastUsedAt: new Date(),
      });
      await this.sessionRepo.save(session);
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        isPhoneVerified: customer.isPhoneVerified,
        tier: customer.tier,
      },
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  customer: {
    id: string;
    name?: string;
    phone: string;
    isPhoneVerified: boolean;
    tier: string;
  };
}
