import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { OtpPurpose } from '../../../entities/customer-otp.entity';

export class SendOtpDto {
  @IsOptional()
  @IsString()
  @Length(10, 15)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
