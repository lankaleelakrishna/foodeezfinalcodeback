import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { MenuPricingRuleType, MenuPricingValueType } from '../../../entities/menu-pricing-rule.entity';

export class UpdateMenuPricingRuleDto {
  @IsOptional()
  @IsEnum(MenuPricingRuleType)
  ruleType?: MenuPricingRuleType;

  @IsOptional()
  @IsEnum(MenuPricingValueType)
  valueType?: MenuPricingValueType;

  @IsOptional()
  @IsNumber()
  value?: number;

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
