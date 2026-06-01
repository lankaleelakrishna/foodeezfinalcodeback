import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MenuScanDto {
  @IsString()
  @IsNotEmpty()
  imageBase64: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
