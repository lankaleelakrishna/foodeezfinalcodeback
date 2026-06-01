import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController, DocumentsPreviewController, DocumentsAdminController } from './documents.controller';
import { RegistrationDocumentsController } from './registration-documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentEntity } from '../../entities/document.entity';
import { RestaurantEntity } from '../../entities/restaurant.entity';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, RestaurantEntity])],
  providers: [DocumentsService, RolesGuard],
  controllers: [DocumentsController, DocumentsPreviewController, DocumentsAdminController, RegistrationDocumentsController],
})
export class DocumentsModule {}
