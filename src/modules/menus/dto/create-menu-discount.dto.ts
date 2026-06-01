import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { MenuPricingValueType } from '../../../entities/menu-pricing-rule.entity';

export class CreateMenuDiscountDto {
  @IsEnum(MenuPricingValueType)
  valueType: MenuPricingValueType;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  conditions?: Record<string, any>;
}
