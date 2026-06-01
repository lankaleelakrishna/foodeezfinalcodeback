import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryTrackingEntity } from '../../entities/delivery-tracking.entity';
import { DeliveryLocationHistoryEntity } from '../../entities/delivery-location-history.entity';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';
import { DeliveryAssignmentEntity } from '../../entities/delivery-assignment.entity';
import { DeliveryTrackingService } from './delivery-tracking.service';
import { DeliveryTrackingController } from './delivery-tracking.controller';
import { DeliveryTrackingGateway } from './delivery-tracking.gateway';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryTrackingEntity,
      DeliveryLocationHistoryEntity,
      DeliveryPartnerEntity,
      DeliveryAssignmentEntity,
    ]),
  ],
  providers: [DeliveryTrackingService, DeliveryTrackingGateway, RolesGuard],
  controllers: [DeliveryTrackingController],
  exports: [DeliveryTrackingService, DeliveryTrackingGateway],
})
export class DeliveryTrackingModule {}
