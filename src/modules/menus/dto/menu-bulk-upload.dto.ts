import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BulkMenuItemDto {
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
  @IsNumber()
  stockOnHand?: number;

  @IsOptional()
  @IsNumber()
  stockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isInStock?: boolean;
}

class BulkMenuCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  displayName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkMenuItemDto)
  items: BulkMenuItemDto[];
}

export class MenuBulkUploadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkMenuCategoryDto)
  categories: BulkMenuCategoryDto[];
}
