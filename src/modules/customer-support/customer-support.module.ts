import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerSupportService } from './customer-support.service';
import { CustomerSupportController } from './customer-support.controller';
import { CustomerSupportTicketEntity } from '../../entities/customer-support-ticket.entity';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerSupportTicketEntity]),
    CustomerAuthModule,
  ],
  providers: [CustomerSupportService],
  controllers: [CustomerSupportController],
  exports: [CustomerSupportService],
})
export class CustomerSupportModule {}
