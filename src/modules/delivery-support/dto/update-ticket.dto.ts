import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SupportTicketPriority, SupportTicketStatus } from '../../../entities/delivery-support-ticket.entity';

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
