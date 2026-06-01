import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliverySupportTicketEntity } from '../../entities/delivery-support-ticket.entity';
import { DeliverySupportService } from './delivery-support.service';
import { DeliverySupportController } from './delivery-support.controller';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([DeliverySupportTicketEntity])],
  providers: [DeliverySupportService, RolesGuard],
  controllers: [DeliverySupportController],
  exports: [DeliverySupportService],
})
export class DeliverySupportModule {}
