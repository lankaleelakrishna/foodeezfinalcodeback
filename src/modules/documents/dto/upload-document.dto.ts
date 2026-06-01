import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DocumentType } from '../../../entities/document.entity';

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsNotEmpty()
  @IsString()
  s3Key: string;

  @IsNotEmpty()
  @IsString()
  filename: string;
}
