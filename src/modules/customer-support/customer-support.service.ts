import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CustomerSupportTicketEntity,
  CustomerTicketPriority,
  CustomerTicketStatus,
} from '../../entities/customer-support-ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class CustomerSupportService {
  constructor(
    @InjectRepository(CustomerSupportTicketEntity)
    private readonly ticketRepo: Repository<CustomerSupportTicketEntity>,
  ) {}

  async createTicket(
    customerId: string,
    dto: CreateTicketDto,
  ): Promise<CustomerSupportTicketEntity> {
    const count = await this.ticketRepo.count();
    const ticketNumber = `TKT-${String(count + 1).padStart(6, '0')}`;

    const ticket = this.ticketRepo.create({
      customerId,
      orderId: dto.orderId,
      ticketNumber,
      type: dto.type,
      description: dto.description,
      priority: dto.priority ?? CustomerTicketPriority.MEDIUM,
      status: CustomerTicketStatus.OPEN,
    });

    return this.ticketRepo.save(ticket);
  }

  async getMyTickets(
    customerId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: CustomerSupportTicketEntity[]; meta: object }> {
    const [data, total] = await this.ticketRepo.findAndCount({
      where: { customerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getTicketById(
    customerId: string,
    ticketId: string,
  ): Promise<CustomerSupportTicketEntity> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, customerId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }
}
