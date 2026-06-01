import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerPaymentsService } from './customer-payments.service';
import { CustomerPaymentsController } from './customer-payments.controller';
import { CustomerOrderEntity } from '../../entities/customer-order.entity';
import { CustomerOrderStatusHistoryEntity } from '../../entities/customer-order-status-history.entity';
import { CustomerWalletEntity } from '../../entities/customer-wallet.entity';
import { CustomerWalletTransactionEntity } from '../../entities/customer-wallet-transaction.entity';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerOrderEntity,
      CustomerOrderStatusHistoryEntity,
      CustomerWalletEntity,
      CustomerWalletTransactionEntity,
    ]),
    CustomerAuthModule,
  ],
  providers: [CustomerPaymentsService],
  controllers: [CustomerPaymentsController],
  exports: [CustomerPaymentsService],
})
export class CustomerPaymentsModule {}
