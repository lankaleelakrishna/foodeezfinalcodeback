import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomerSupportService } from './customer-support.service';
import { CustomerJwtGuard } from '../customer-auth/guards/customer-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerJwtPayload } from '../customer-auth/strategies/customer-jwt.strategy';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Controller('customer/support')
@UseGuards(CustomerJwtGuard)
export class CustomerSupportController {
  constructor(private readonly supportService: CustomerSupportService) {}

  @Post('tickets')
  createTicket(@CurrentUser() c: CustomerJwtPayload, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(c.sub, dto);
  }

  @Get('tickets')
  getTickets(
    @CurrentUser() c: CustomerJwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.supportService.getMyTickets(c.sub, page, limit);
  }

  @Get('tickets/:ticketId')
  getTicket(@CurrentUser() c: CustomerJwtPayload, @Param('ticketId') ticketId: string) {
    return this.supportService.getTicketById(c.sub, ticketId);
  }
}
