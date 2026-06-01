import { IsEnum, IsString } from 'class-validator';

export enum PaymentGateway {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
}

export class InitiatePaymentDto {
  @IsString()
  orderId: string;

  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;
}
