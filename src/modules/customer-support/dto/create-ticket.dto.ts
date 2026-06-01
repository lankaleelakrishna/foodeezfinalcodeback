import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CustomerTicketPriority,
  CustomerTicketType,
} from '../../../entities/customer-support-ticket.entity';

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsEnum(CustomerTicketType)
  @Transform(({ value }) => {
    if (value === null || value === undefined) return value;
    const v = String(value).trim().toUpperCase();
    // map legacy/frontend values to canonical enum values
    if (v === 'ORDERISSUE' || v === 'ORDER_ISSUE' || v === 'ORDER ISSUE')
      return CustomerTicketType.WRONG_ORDER;
    // allow passing the canonical enum value directly
    return v;
  })
  type: CustomerTicketType;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsEnum(CustomerTicketPriority)
  priority?: CustomerTicketPriority;
}
