import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryAssignmentEntity } from '../../entities/delivery-assignment.entity';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';
import { DeliveryPayoutEntity } from '../../entities/delivery-payout.entity';
import { DeliveryAnalyticsService } from './delivery-analytics.service';
import { DeliveryAnalyticsController } from './delivery-analytics.controller';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryAssignmentEntity,
      DeliveryPartnerEntity,
      DeliveryPayoutEntity,
    ]),
  ],
  providers: [DeliveryAnalyticsService, RolesGuard],
  controllers: [DeliveryAnalyticsController],
  exports: [DeliveryAnalyticsService],
})
export class DeliveryAnalyticsModule {}
