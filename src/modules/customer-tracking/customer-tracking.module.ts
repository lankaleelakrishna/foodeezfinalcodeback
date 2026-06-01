import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerTrackingService } from './customer-tracking.service';
import { CustomerOrderEntity } from '../../entities/customer-order.entity';
import { DeliveryTrackingEntity } from '../../entities/delivery-tracking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerOrderEntity, DeliveryTrackingEntity]),
  ],
  providers: [CustomerTrackingService],
  exports: [CustomerTrackingService],
})
export class CustomerTrackingModule {}
