import { IsDateString, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

/**
 * Step 2: Compliance, banking and business details
 */
export class RegisterStep2Dto {
  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsDateString()
  gstExpiryDate?: string;

  @IsOptional()
  @IsString()
  fssaiNumber?: string;

  @IsOptional()
  @IsDateString()
  fssaiExpiryDate?: string;

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
  @IsString()
  bankAccountNumberConfirm?: string;

  @IsOptional()
  @IsIn(['SAVINGS', 'CURRENT'])
  accountType?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  // Document s3Keys or filenames
  @IsOptional()
  @IsString()
  gstDocumentKey?: string;

  @IsOptional()
  @IsString()
  
  fssaiDocumentKey?: string;

  @IsOptional()
  @IsString()
  bankDocumentKey?: string;
  
  @IsOptional()
  @IsString()
  panDocumentKey?: string;

  @IsOptional()
  @IsString()
  panNumber?: string;

  @IsOptional()
  @IsString()
  frontPhotoKey?: string;
}
