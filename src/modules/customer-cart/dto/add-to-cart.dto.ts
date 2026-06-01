import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CartAddonDto {
  @IsString()
  addonId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class AddToCartDto {
  @IsString()
  menuItemId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartAddonDto)
  selectedAddons?: CartAddonDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialNote?: string;
}
