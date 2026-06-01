import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { CustomerEntity } from '../../entities/customer.entity';
import { CustomerOtpEntity } from '../../entities/customer-otp.entity';
import { CustomerSessionEntity } from '../../entities/customer-session.entity';
import { CustomerWalletEntity } from '../../entities/customer-wallet.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity,
      CustomerOtpEntity,
      CustomerSessionEntity,
      CustomerWalletEntity,
    ]),
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('CUSTOMER_JWT_SECRET', config.get<string>('JWT_SECRET', 'change-me')),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    NotificationsModule,
  ],
  providers: [CustomerAuthService, CustomerJwtStrategy, CustomerJwtGuard],
  controllers: [CustomerAuthController],
  exports: [CustomerAuthService, CustomerJwtGuard, CustomerJwtStrategy],
})
export class CustomerAuthModule {}
