import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerEntity } from '../../entities/customer.entity';
import { CustomerOrderEntity } from '../../entities/customer-order.entity';
import { CustomerOrderItemEntity } from '../../entities/customer-order-item.entity';
import { CustomerOrderStatusHistoryEntity } from '../../entities/customer-order-status-history.entity';
import { CustomerSupportTicketEntity } from '../../entities/customer-support-ticket.entity';
import { CustomerWalletEntity } from '../../entities/customer-wallet.entity';
import { AdminCustomersService } from './admin-customers.service';
import {
  AdminCustomersController,
  AdminOrdersController,
  RestaurantOrdersController,
  AdminTicketsController,
} from './admin-customers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity,
      CustomerOrderEntity,
      CustomerOrderItemEntity,
      CustomerOrderStatusHistoryEntity,
      CustomerSupportTicketEntity,
      CustomerWalletEntity,
    ]),
  ],
  controllers: [
    AdminCustomersController,
    AdminOrdersController,
    RestaurantOrdersController,
    AdminTicketsController,
  ],
  providers: [AdminCustomersService],
})
export class AdminCustomersModule {}
