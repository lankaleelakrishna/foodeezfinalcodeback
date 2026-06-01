import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerReviewsService } from './customer-reviews.service';
import { CustomerReviewsController } from './customer-reviews.controller';
import { CustomerReviewEntity } from '../../entities/customer-review.entity';
import { CustomerOrderEntity } from '../../entities/customer-order.entity';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerReviewEntity,
      CustomerOrderEntity,
      DeliveryPartnerEntity,
    ]),
    CustomerAuthModule,
  ],
  providers: [CustomerReviewsService],
  controllers: [CustomerReviewsController],
  exports: [CustomerReviewsService],
})
export class CustomerReviewsModule {}
