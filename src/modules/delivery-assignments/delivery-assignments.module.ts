import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryAssignmentEntity } from '../../entities/delivery-assignment.entity';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';
import { DeliveryAssignmentsService } from './delivery-assignments.service';
import { DeliveryAssignmentsController } from './delivery-assignments.controller';
import { DeliveryPartnersModule } from '../delivery-partners/delivery-partners.module';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryAssignmentEntity, DeliveryPartnerEntity]),
    DeliveryPartnersModule,
  ],
  providers: [DeliveryAssignmentsService, RolesGuard],
  controllers: [DeliveryAssignmentsController],
  exports: [DeliveryAssignmentsService],
})
export class DeliveryAssignmentsModule {}
