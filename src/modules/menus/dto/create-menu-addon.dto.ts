import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMenuAddonDto {
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

  @IsBoolean()
  isRequired: boolean;

  @IsNumber()
  @Min(0)
  minSelections: number;

  @IsNumber()
  @Min(0)
  maxSelections: number;

  @IsNumber()
  @Min(0)
  sortOrder: number;

  @IsBoolean()
  isVisible: boolean;
}
