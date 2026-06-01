import { IsArray, IsEmail, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, IsIn } from 'class-validator';

export class CreateRestaurantDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  ownerName: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber('IN')
  phone: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsNotEmpty()
  @IsString()
  zipCode: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  fssaiNumber?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankAccountHolderName?: string;

  @IsOptional()
  @IsIn(['SAVINGS', 'CURRENT'])
  accountType?: string;

  @IsOptional()
  @IsString()
  panNumber?: string;

  @IsOptional()
  @IsString()
  frontPhoto?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  leadSource?: string;

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
  deliveryZones?: any[];

  @IsOptional()
  @IsArray()
  storePhotos?: string[];

  @IsOptional()
  temporaryClosure?: boolean;

  @IsOptional()
  holidayMode?: boolean;

  @IsOptional()
  gstExpiryDate?: Date;

  @IsOptional()
  fssaiExpiryDate?: Date;

  @IsOptional()
  @IsString()
  menuExtractedJson?: string;

  @IsOptional()
  gstPresent?: boolean;
}
