import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerCartService } from './customer-cart.service';
import { CustomerCartController } from './customer-cart.controller';
import { CustomerCartEntity } from '../../entities/customer-cart.entity';
import { CustomerCartItemEntity } from '../../entities/customer-cart-item.entity';
import { CustomerCouponEntity } from '../../entities/customer-coupon.entity';
import { CustomerCouponUsageEntity } from '../../entities/customer-coupon-usage.entity';
import { MenuItemEntity } from '../../entities/menu-item.entity';
import { BranchEntity } from '../../entities/branch.entity';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerCartEntity,
      CustomerCartItemEntity,
      CustomerCouponEntity,
      CustomerCouponUsageEntity,
      MenuItemEntity,
      BranchEntity,
    ]),
    CustomerAuthModule,
  ],
  providers: [CustomerCartService],
  controllers: [CustomerCartController],
  exports: [CustomerCartService],
})
export class CustomerCartModule {}
