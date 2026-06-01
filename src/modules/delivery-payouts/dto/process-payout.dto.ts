import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PayoutType } from '../../../entities/delivery-payout.entity';

export class ProcessPayoutDto {
  @IsNotEmpty()
  @IsString()
  partnerId: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsEnum(PayoutType)
  payoutType: PayoutType;

  @IsOptional()
  @IsString()
  assignmentId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  periodStart?: Date;

  @IsOptional()
  periodEnd?: Date;
}
