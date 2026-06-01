import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CustomerLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  deviceOs?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  appVersion?: string;
}
