import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  CustomerTicketStatus,
  CustomerTicketPriority,
} from '../../../entities/customer-support-ticket.entity';

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(CustomerTicketStatus)
  status?: CustomerTicketStatus;

  @IsOptional()
  @IsEnum(CustomerTicketPriority)
  priority?: CustomerTicketPriority;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
