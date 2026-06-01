import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AutoAssignDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  restaurantId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsNotEmpty()
  @IsNumber()
  restaurantLatitude: number;

  @IsNotEmpty()
  @IsNumber()
  restaurantLongitude: number;

  @IsNotEmpty()
  @IsNumber()
  customerLatitude: number;

  @IsNotEmpty()
  @IsNumber()
  customerLongitude: number;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsNumber()
  deliveryFee?: number;
}
