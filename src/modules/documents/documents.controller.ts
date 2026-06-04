import { Body, BadRequestException, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('restaurants/:restaurantId/documents')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  async list(@Param('restaurantId') restaurantId: string) {
    return this.documentsService.findByRestaurant(restaurantId);
  }

  @Patch('restaurants/:restaurantId/documents/:documentId')
  @Roles(UserRole.SuperAdmin, UserRole.SalesOperator)
  async updateDocumentStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('documentId') documentId: string,
    @Body('status') status: unknown,
    @Body('reason') reason?: unknown,
  ) {
    if (typeof status !== 'string' || !status.trim()) {
      throw new BadRequestException('Document status is required and must be a string');
    }

    const normalizedStatus = status.trim().toLowerCase();
    if (normalizedStatus === 'verified') {
      return this.documentsService.verifyDocument(restaurantId, documentId);
    }

    if (normalizedStatus === 'pending') {
      return this.documentsService.setDocumentPending(restaurantId, documentId);
    }

    if (normalizedStatus === 'rejected') {
      if (typeof reason !== 'string' || !reason.trim()) {
        throw new BadRequestException('A rejection reason is required when rejecting a document.');
      }
      return this.documentsService.rejectDocument(restaurantId, documentId, reason.trim());
    }

    throw new BadRequestException('Unsupported document status. Use verified, pending, or rejected.');
  }
}

@Controller()
export class DocumentsPreviewController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('documents/preview/:documentId')
  @Get('documents/:documentId/preview')
  @Get('restaurants/:restaurantId/documents/:documentId/preview')
  async previewById(
    @Param() params: { documentId?: string; restaurantId?: string },
    @Res() res: Response,
  ) {
    const documentId = params.documentId || params.restaurantId;
    if (!documentId) throw new BadRequestException('Document ID is required');
    return this.documentsService.preview(documentId, '', '', res);
  }

  @Get('documents/:documentId/:type/:filename')
  @Get('restaurants/:restaurantId/documents/:type/:filename')
  async preview(
    @Param() params: { documentId?: string; restaurantId?: string; type: string; filename: string },
    @Res() res: Response,
  ) {
    const idOrRestaurantId = params.documentId || params.restaurantId;
    if (!idOrRestaurantId) {
      throw new BadRequestException('Document ID or restaurant ID is required');
    }

    return this.documentsService.preview(idOrRestaurantId, params.type, params.filename, res);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/documents')
export class DocumentsAdminController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Get all documents for admin review - SuperAdmin only
   * Used to review all uploaded documents during registration
   */
  @Get()
  @Roles(UserRole.SuperAdmin)
  async getAllDocumentsForReview() {
    return this.documentsService.findAllForAdminReview();
  }

  /**
   * Get all documents for a specific restaurant - SuperAdmin and SalesOperator
   * Used during restaurant admin dashboard
   */
  @Get('restaurant/:restaurantId')
  @Roles(UserRole.SuperAdmin, UserRole.SalesOperator)
  async getRestaurantDocumentsForReview(@Param('restaurantId') restaurantId: string) {
    return this.documentsService.findRestaurantDocumentsForAdminReview(restaurantId);
  }

  /**
   * Open/Preview document - SuperAdmin can open any document
   */
  @Get(':documentId/preview')
  @Roles(UserRole.SuperAdmin, UserRole.SalesOperator)
  async previewDocument(
    @Param('documentId') documentId: string,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.preview(documentId, '', '', res);
  }
}
