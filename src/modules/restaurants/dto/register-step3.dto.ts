import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

/**
 * Step 3: Upload & scan menu
 */
export class RegisterStep3Dto {
  @IsNotEmpty()
  @IsString()
  menuImageBase64: string;

  @IsOptional()
  @IsString()
  referralName?: string;

  @IsOptional()
  @IsString()
  brandDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisineTags?: string[];

  @IsOptional()
  serviceRadiusKm?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  storePhotos?: string[];

  @IsOptional()
  @IsString()
  coverPhotoKey?: string;

  @IsOptional()
  temporaryClosure?: boolean;

  @IsOptional()
  holidayMode?: boolean;
}
