import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  label: string;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  addressLine1: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  city: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  state: string;

  @IsString()
  @Length(6, 6)
  pincode: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  landmark?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
