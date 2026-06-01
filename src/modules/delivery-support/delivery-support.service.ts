import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeliverySupportTicketEntity,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '../../entities/delivery-support-ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateSosDto } from './dto/create-sos.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class DeliverySupportService {
  constructor(
    @InjectRepository(DeliverySupportTicketEntity)
    private readonly ticketRepository: Repository<DeliverySupportTicketEntity>,
  ) {}

  async createTicket(payload: CreateTicketDto) {
    const ticket = this.ticketRepository.create({
      partnerId: payload.partnerId,
      assignmentId: payload.assignmentId,
      orderId: payload.orderId,
      ticketType: payload.ticketType,
      priority: payload.priority ?? SupportTicketPriority.MEDIUM,
      status: SupportTicketStatus.OPEN,
      title: payload.title,
      description: payload.description,
    });

    return this.ticketRepository.save(ticket);
  }

  async createSos(payload: CreateSosDto) {
    const ticket = this.ticketRepository.create({
      partnerId: payload.partnerId,
      assignmentId: payload.assignmentId,
      ticketType: SupportTicketType.SOS,
      priority: SupportTicketPriority.CRITICAL,
      status: SupportTicketStatus.OPEN,
      title: `SOS Alert from rider`,
      description: payload.description ?? 'Rider has triggered an SOS alert and requires immediate assistance.',
      sosLatitude: payload.latitude,
      sosLongitude: payload.longitude,
    });

    return this.ticketRepository.save(ticket);
  }

  async findAll(page = 1, limit = 20, status?: SupportTicketStatus, type?: SupportTicketType) {
    const query = this.ticketRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.partner', 'partner')
      .orderBy('t.priority', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) query.andWhere('t.status = :status', { status });
    if (type) query.andWhere('t.ticket_type = :type', { type });

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['partner'],
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found.');
    }

    return ticket;
  }

  async findByPartner(partnerId: string, page = 1, limit = 20) {
    const [data, total] = await this.ticketRepository.findAndCount({
      where: { partnerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async updateTicket(id: string, payload: UpdateTicketDto) {
    const ticket = await this.findOne(id);

    if (payload.status) ticket.status = payload.status;
    if (payload.priority) ticket.priority = payload.priority;
    if (payload.adminNotes !== undefined) ticket.adminNotes = payload.adminNotes;

    if (
      payload.status === SupportTicketStatus.RESOLVED ||
      payload.status === SupportTicketStatus.CLOSED
    ) {
      ticket.resolvedAt = new Date();
    }

    return this.ticketRepository.save(ticket);
  }

  async getOpenSosAlerts() {
    return this.ticketRepository.find({
      where: { ticketType: SupportTicketType.SOS, status: SupportTicketStatus.OPEN },
      relations: ['partner'],
      order: { createdAt: 'DESC' },
    });
  }
}
