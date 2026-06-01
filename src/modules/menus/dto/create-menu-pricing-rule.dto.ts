import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { MenuPricingRuleType, MenuPricingValueType } from '../../../entities/menu-pricing-rule.entity';

export class CreateMenuPricingRuleDto {
  @IsEnum(MenuPricingRuleType)
  ruleType: MenuPricingRuleType;

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
