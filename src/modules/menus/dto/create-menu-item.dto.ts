import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMenuDiscountDto } from './create-menu-discount.dto';

export class CreateMenuItemDto {
  @IsUUID()
  categoryId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockOnHand?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockThreshold?: number = 0;

  @IsOptional()
  @IsBoolean()
  autoOutOfStock?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  minOrderQuantity?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxOrderQuantity?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isInStock?: boolean = true;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMenuDiscountDto)
  discount?: CreateMenuDiscountDto;
}
