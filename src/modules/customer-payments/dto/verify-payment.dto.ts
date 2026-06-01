import { IsEnum, IsString } from 'class-validator';
import { PaymentGateway } from './initiate-payment.dto';

export class VerifyPaymentDto {
  @IsString()
  orderId: string;

  @IsString()
  paymentId: string;

  @IsString()
  signature: string;

  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;
}
