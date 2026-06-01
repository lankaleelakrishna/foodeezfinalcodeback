import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CustomerOrderPaymentMethod } from '../../../entities/customer-order.entity';

export class PlaceOrderDto {
  @IsString()
  deliveryAddressId: string;

  @IsEnum(CustomerOrderPaymentMethod)
  paymentMethod: CustomerOrderPaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialInstructions?: string;

  @IsOptional()
  @IsBoolean()
  useWalletBalance?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
