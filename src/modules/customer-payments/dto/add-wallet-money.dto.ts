import { IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentGateway } from './initiate-payment.dto';

export class AddWalletMoneyDto {
  @IsNumber()
  @Min(10)
  @Type(() => Number)
  amount: number;

  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;
}
