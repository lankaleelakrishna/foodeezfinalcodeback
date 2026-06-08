import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class NearbyRestaurantsDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  lng: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  @Type(() => Number)
  radius?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  cuisine?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  @Type(() => Number)
  maxDeliveryTime?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isVeg?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string;
}
