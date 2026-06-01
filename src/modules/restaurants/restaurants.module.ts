import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantEntity } from '../../entities/restaurant.entity';
import { UserEntity } from '../../entities/user.entity';
import { DocumentEntity } from '../../entities/document.entity';
import { CustomerEntity } from '../../entities/customer.entity';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { MenusModule } from '../menus/menus.module';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantEntity, UserEntity, DocumentEntity, CustomerEntity, DeliveryPartnerEntity]),
    NotificationsModule,
    MenusModule,
  ],
  providers: [RestaurantsService, RolesGuard],
  controllers: [RestaurantsController],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
