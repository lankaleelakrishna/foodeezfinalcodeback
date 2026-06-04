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
import { memoryStorage } from 'multer';
import { DocumentsService } from './documents.service';
import { SupabaseStorageService } from '../supabase-storage/supabase-storage.service';

interface UploadDocumentDto {
  type: 'PAN' | 'GST' | 'FSSAI' | 'BANK';
}

const ALLOWED_MIMETYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const VALID_TYPES = ['PAN', 'GST', 'FSSAI', 'BANK'];

@Controller('restaurants/:restaurantId/documents/registration')
export class RegistrationDocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly storageService: SupabaseStorageService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_: any, file: Express.Multer.File, cb: any) => {
        if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('Only PDF, JPEG, PNG, WebP files are allowed'), false);
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
    if (!file) throw new BadRequestException('File is required');
    if (!body.type) throw new BadRequestException('Document type (type) is required');

    const documentType = body.type.toUpperCase() as 'PAN' | 'GST' | 'FSSAI' | 'BANK';
    if (!VALID_TYPES.includes(documentType)) {
      throw new BadRequestException('Invalid document type. Must be one of: PAN, GST, FSSAI, BANK');
    }

    const ext = file.originalname.split('.').pop() || 'bin';
    const filename = `${documentType}-${Date.now()}.${ext}`;
    const remotePath = `registration/${restaurantId}/${filename}`;

    let fileUrl: string;

    if (this.storageService.isReady()) {
      fileUrl = await this.storageService.upload(remotePath, file.buffer, file.mimetype);
    } else {
      // Fallback: save to local disk when Supabase is not configured
      const { mkdirSync, existsSync, writeFileSync } = await import('fs');
      const { join } = await import('path');
      const localDir = join(process.cwd(), 'uploads', 'registration', restaurantId);
      if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });
      const localPath = join(localDir, filename);
      writeFileSync(localPath, file.buffer);
      fileUrl = `uploads/registration/${restaurantId}/${filename}`;
    }

    return this.documentsService.createForRegistration(restaurantId, filename, documentType, fileUrl);
  }
}
