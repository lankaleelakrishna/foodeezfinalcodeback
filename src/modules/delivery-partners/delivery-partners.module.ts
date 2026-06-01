import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';
import { DeliveryPartnersService } from './delivery-partners.service';
import { DeliveryPartnersController } from './delivery-partners.controller';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryPartnerEntity]), NotificationsModule],
  providers: [DeliveryPartnersService, RolesGuard],
  controllers: [DeliveryPartnersController],
  exports: [DeliveryPartnersService],
})
export class DeliveryPartnersModule {}
