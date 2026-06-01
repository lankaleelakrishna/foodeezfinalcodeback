import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ManualAssignDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  partnerId: string;

  @IsNotEmpty()
  @IsString()
  restaurantId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsNumber()
  restaurantLatitude?: number;

  @IsOptional()
  @IsNumber()
  restaurantLongitude?: number;

  @IsOptional()
  @IsNumber()
  customerLatitude?: number;

  @IsOptional()
  @IsNumber()
  customerLongitude?: number;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsNumber()
  deliveryFee?: number;
}
