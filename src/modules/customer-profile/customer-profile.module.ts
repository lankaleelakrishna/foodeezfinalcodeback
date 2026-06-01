import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerProfileService } from './customer-profile.service';
import { CustomerProfileController } from './customer-profile.controller';
import { CustomerEntity } from '../../entities/customer.entity';
import { CustomerAddressEntity } from '../../entities/customer-address.entity';
import { CustomerFavoriteRestaurantEntity } from '../../entities/customer-favorite-restaurant.entity';
import { CustomerFavoriteItemEntity } from '../../entities/customer-favorite-item.entity';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity,
      CustomerAddressEntity,
      CustomerFavoriteRestaurantEntity,
      CustomerFavoriteItemEntity,
    ]),
    CustomerAuthModule,
  ],
  providers: [CustomerProfileService],
  controllers: [CustomerProfileController],
  exports: [CustomerProfileService],
})
export class CustomerProfileModule {}
