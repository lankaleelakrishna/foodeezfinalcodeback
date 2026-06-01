import { Injectable, NotFoundException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'express';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { Repository } from 'typeorm';
import { DocumentEntity, DocumentType } from '../../entities/document.entity';
import { RestaurantEntity } from '../../entities/restaurant.entity';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
    @InjectRepository(RestaurantEntity)
    private readonly restaurantRepository: Repository<RestaurantEntity>,
  ) {}

  async findByRestaurant(restaurantId: string) {
    const docs = await this.documentRepository.find({
      where: { restaurantId },
      order: { uploadedAt: 'DESC' },
    });

    // Attach a preview URL the frontend can open (uses the preview route)
    return docs.map((d) => ({
      id: d.id,
      type: d.type,
      filename: d.filename,
      s3Key: d.s3Key,
      status: d.status,
      uploadedAt: d.uploadedAt,
      previewUrl: `/api/v1/documents/preview/${d.id}`,
    }));
  }

  /**
   * Find all documents across restaurants - accessible to SuperAdmin only
   * Used during restaurant registration Step 2 review
   */
  async findAllForAdminReview() {
    return this.documentRepository.find({
      relations: ['restaurant'],
      order: { uploadedAt: 'DESC' },
    });
  }

  /**
   * Find all documents for a specific restaurant - accessible to SuperAdmin
   * Used during admin dashboard to review restaurant documents
   */
  async findRestaurantDocumentsForAdminReview(restaurantId: string) {
    this.logger.log(`Fetching documents for restaurant: ${restaurantId}`);
    const documents = await this.documentRepository.find({
      where: { restaurantId },
      relations: ['restaurant'],
      order: { uploadedAt: 'DESC' },
    });
    this.logger.log(`Found ${documents.length} documents for restaurant ${restaurantId}`);
    return documents;
  }

  async preview(idOrRestaurantId: string, type: string, filename: string, res: Response) {
    const normalizedType = (type || '').toUpperCase() as DocumentType;

    // Try to resolve document by different strategies for robustness
    let document = null as DocumentEntity | null;

    // 1) If caller passed a document id (likely a UUID), try direct lookup first
    try {
      document = await this.documentRepository.findOne({ where: { id: idOrRestaurantId } });
    } catch (e) {
      // ignore and continue
    }

    // 2) If not found by id, and type+filename provided, try exact match by id+type+filename
    if (!document && type && filename) {
      document = await this.documentRepository.findOne({
        where: {
          id: idOrRestaurantId,
          type: normalizedType,
          filename,
        },
      });
    }

    // 3) Try matching by restaurant id + type + filename
    if (!document) {
      document = await this.documentRepository.findOne({
        where: {
          restaurant: { id: idOrRestaurantId },
          type: normalizedType || undefined,
          filename: filename || undefined,
        },
      });
    }

    // 4) If still not found and type provided but filename missing, return the latest of that type for the restaurant
    if (!document && idOrRestaurantId && type && !filename) {
      document = await this.documentRepository.findOne({
        where: { restaurant: { id: idOrRestaurantId }, type: normalizedType },
        order: { uploadedAt: 'DESC' },
      });
    }

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (/^https?:\/\//i.test(document.s3Key)) {
      return res.redirect(document.s3Key);
    }

    if (/^s3:\/\//i.test(document.s3Key)) {
      const s3Url = document.s3Key.replace(/^s3:\/\//i, 'https://');
      return res.redirect(s3Url);
    }

    const normalizedKey = document.s3Key.replace(/\\/g, '/').trim();
    const candidatePaths = [
      resolve(normalizedKey),
      resolve('uploads', normalizedKey),
      resolve('public', normalizedKey),
      resolve(__dirname, '..', '..', normalizedKey),
      resolve(__dirname, '..', '..', 'uploads', normalizedKey),
      resolve(__dirname, '..', '..', 'public', normalizedKey),
    ];

    const existingPath = candidatePaths.find((path) => existsSync(path));
    if (existingPath) {
      res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);
      return res.sendFile(existingPath);
    }

    throw new NotFoundException('Document file not found');
  }

  /**
   * Create a document during restaurant registration
   * Called after restaurant is created, when files are uploaded via multipart/form-data
   */
  async createForRegistration(
    restaurantId: string,
    filename: string,
    type: DocumentType | string,
    filePath: string,
  ) {
    // Validate restaurant exists
    const restaurant = await this.restaurantRepository.findOne({ where: { id: restaurantId } });
    if (!restaurant) {
      throw new BadRequestException(`Restaurant with ID ${restaurantId} not found`);
    }

    // Validate document type
    const validTypes: DocumentType[] = [DocumentType.PAN, DocumentType.GST, DocumentType.FSSAI, DocumentType.BANK];
    const documentType = (type || '').toUpperCase();
    if (!validTypes.includes(documentType as DocumentType)) {
      throw new BadRequestException(`Invalid document type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Create document entity
    const document = this.documentRepository.create({
      restaurantId,
      filename,
      type: documentType as DocumentType,
      s3Key: filePath,
      uploadedAt: new Date(),
      status: 'uploaded',
    });

    const saved = await this.documentRepository.save(document);

    this.logger.log(`✓ Document created during registration: restaurantId=${restaurantId}, type=${documentType}, file=${filename}`);

    return saved;
  }

  /** Mark document as verified (admin) */
  async verifyDocument(restaurantId: string, documentId: string) {
    const document = await this.documentRepository.findOne({ where: { id: documentId, restaurantId } });
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found for restaurant ${restaurantId}`);
    }
    document.status = 'verified';
    return this.documentRepository.save(document);
  }

  /** Mark document as rejected (admin) */
  async rejectDocument(restaurantId: string, documentId: string, reason?: string) {
    const document = await this.documentRepository.findOne({ where: { id: documentId, restaurantId } });
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found for restaurant ${restaurantId}`);
    }
    document.status = 'rejected';
    if (reason) {
      document.metadata = reason;
    }
    return this.documentRepository.save(document);
  }
}
