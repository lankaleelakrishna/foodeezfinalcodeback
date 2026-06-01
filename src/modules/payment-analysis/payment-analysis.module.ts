import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentAnalysisController } from './payment-analysis.controller';
import { PaymentAnalysisService } from './payment-analysis.service';
import { PaymentEntity } from '../../entities/payment.entity';
import { RestaurantEntity } from '../../entities/restaurant.entity';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity, RestaurantEntity])],
  providers: [PaymentAnalysisService, RolesGuard],
  controllers: [PaymentAnalysisController],
})
export class PaymentAnalysisModule {}
