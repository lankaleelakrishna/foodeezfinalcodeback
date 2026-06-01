import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SupportTicketPriority, SupportTicketType } from '../../../entities/delivery-support-ticket.entity';

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  assignmentId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsNotEmpty()
  @IsEnum(SupportTicketType)
  ticketType: SupportTicketType;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;
}
