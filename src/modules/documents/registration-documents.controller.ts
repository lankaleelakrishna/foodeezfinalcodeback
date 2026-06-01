/**
 * Placeholder file: registration-documents.controller.ts
 *
 * Paste your original `registration-documents.controller.ts` here.
 * If you'd like, I can scaffold a basic NestJS controller using
 * your pasted contents or wire it up to the existing documents
 * module.
 */

export const REGISTRATION_DOCUMENTS_CONTROLLER_PLACEHOLDER =
  'Paste registration-documents.controller.ts contents here';
import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { DocumentsService } from './documents.service';

interface UploadDocumentDto {
  type: 'PAN' | 'GST' | 'FSSAI' | 'BANK';
}

@Controller('restaurants/:restaurantId/documents/registration')
export class RegistrationDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Upload documents during restaurant registration (Step 2)
   * Accepts multipart/form-data with:
   * - file: Binary file data
   * - type: Document type (PAN, GST, FSSAI, BANK)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const restaurantId = req.params.restaurantId;
          const uploadPath = `./uploads/registration/${restaurantId}`;
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const type = req.body?.type || 'DOCUMENT';
          const timestamp = Date.now();
          const ext = extname(file.originalname);
          const filename = `${type}-${timestamp}${ext}`;
          cb(null, filename);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only PDF, JPEG, PNG, WebP files are allowed'),
            false
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadForRegistration(
    @Param('restaurantId') restaurantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!body.type) {
      throw new BadRequestException('Document type (type) is required');
    }

    const documentType = body.type.toUpperCase() as 'PAN' | 'GST' | 'FSSAI' | 'BANK';
    if (!['PAN', 'GST', 'FSSAI', 'BANK'].includes(documentType)) {
      throw new BadRequestException('Invalid document type. Must be one of: PAN, GST, FSSAI, BANK');
    }

    return this.documentsService.createForRegistration(
      restaurantId,
      file.filename,
      documentType,
      file.path,
    );
  }
}
