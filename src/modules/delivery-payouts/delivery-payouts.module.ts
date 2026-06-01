import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPayoutEntity } from '../../entities/delivery-payout.entity';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';
import { DeliveryPayoutsService } from './delivery-payouts.service';
import { DeliveryPayoutsController } from './delivery-payouts.controller';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryPayoutEntity, DeliveryPartnerEntity])],
  providers: [DeliveryPayoutsService, RolesGuard],
  controllers: [DeliveryPayoutsController],
  exports: [DeliveryPayoutsService],
})
export class DeliveryPayoutsModule {}
