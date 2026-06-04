import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController, DocumentsPreviewController, DocumentsAdminController } from './documents.controller';
import { RegistrationDocumentsController } from './registration-documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentEntity } from '../../entities/document.entity';
import { RestaurantEntity } from '../../entities/restaurant.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupabaseStorageModule } from '../supabase-storage/supabase-storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, RestaurantEntity]), NotificationsModule, SupabaseStorageModule],
  providers: [DocumentsService, RolesGuard],
  controllers: [DocumentsController, DocumentsPreviewController, DocumentsAdminController, RegistrationDocumentsController],
})
export class DocumentsModule {}
