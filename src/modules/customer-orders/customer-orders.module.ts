import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOrdersService } from './customer-orders.service';
import { CustomerOrdersController } from './customer-orders.controller';
import { CustomerOrderEntity } from '../../entities/customer-order.entity';
import { CustomerOrderItemEntity } from '../../entities/customer-order-item.entity';
import { CustomerOrderStatusHistoryEntity } from '../../entities/customer-order-status-history.entity';
import { CustomerCartEntity } from '../../entities/customer-cart.entity';
import { CustomerCartItemEntity } from '../../entities/customer-cart-item.entity';
import { CustomerEntity } from '../../entities/customer.entity';
import { CustomerAddressEntity } from '../../entities/customer-address.entity';
import { CustomerWalletEntity } from '../../entities/customer-wallet.entity';
import { CustomerWalletTransactionEntity } from '../../entities/customer-wallet-transaction.entity';
import { CustomerCouponUsageEntity } from '../../entities/customer-coupon-usage.entity';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerOrderEntity,
      CustomerOrderItemEntity,
      CustomerOrderStatusHistoryEntity,
      CustomerCartEntity,
      CustomerCartItemEntity,
      CustomerEntity,
      CustomerAddressEntity,
      CustomerWalletEntity,
      CustomerWalletTransactionEntity,
      CustomerCouponUsageEntity,
    ]),
    CustomerAuthModule,
    NotificationsModule,
  ],
  providers: [CustomerOrdersService],
  controllers: [CustomerOrdersController],
  exports: [CustomerOrdersService],
})
export class CustomerOrdersModule {}
