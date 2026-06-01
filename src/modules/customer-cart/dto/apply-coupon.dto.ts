import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ApplyCouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Transform(({ value }) => value?.toUpperCase().trim())
  couponCode: string;
}
