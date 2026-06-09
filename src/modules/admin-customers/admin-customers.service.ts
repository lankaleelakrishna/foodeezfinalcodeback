import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CustomerEntity, CustomerStatus, CustomerTier } from '../../entities/customer.entity';
import { CustomerOrderEntity, CustomerOrderStatus } from '../../entities/customer-order.entity';
import { CustomerOrderItemEntity } from '../../entities/customer-order-item.entity';
import { CustomerOrderStatusHistoryEntity } from '../../entities/customer-order-status-history.entity';
import {
  CustomerSupportTicketEntity,
  CustomerTicketStatus,
  CustomerTicketType,
  CustomerTicketPriority,
} from '../../entities/customer-support-ticket.entity';
import { CustomerWalletEntity } from '../../entities/customer-wallet.entity';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { DeliveryTrackingGateway } from '../delivery-tracking/delivery-tracking.gateway';

@Injectable()
export class AdminCustomersService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,
    @InjectRepository(CustomerOrderEntity)
    private readonly orderRepo: Repository<CustomerOrderEntity>,
    @InjectRepository(CustomerOrderItemEntity)
    private readonly orderItemRepo: Repository<CustomerOrderItemEntity>,
    @InjectRepository(CustomerOrderStatusHistoryEntity)
    private readonly historyRepo: Repository<CustomerOrderStatusHistoryEntity>,
    @InjectRepository(CustomerSupportTicketEntity)
    private readonly ticketRepo: Repository<CustomerSupportTicketEntity>,
    @InjectRepository(CustomerWalletEntity)
    private readonly walletRepo: Repository<CustomerWalletEntity>,
    @Optional() private readonly trackingGateway?: DeliveryTrackingGateway,
  ) {}

  // ─── Customers ───────────────────────────────────────────────────────────────

  async listCustomers(opts: {
    page: number;
    limit: number;
    search?: string;
    status?: CustomerStatus;
    tier?: CustomerTier;
  }) {
    const where: any[] = [];

    const base: Record<string, any> = {};
    if (opts.status) base.status = opts.status;
    if (opts.tier) base.tier = opts.tier;

    if (opts.search) {
      const term = opts.search.trim();
      where.push({ ...base, name: ILike(`%${term}%`) });
      where.push({ ...base, phone: ILike(`%${term}%`) });
      where.push({ ...base, email: ILike(`%${term}%`) });
    } else {
      where.push(base);
    }

    const [data, total] = await this.customerRepo.findAndCount({
      where,
      select: [
        'id',
        'name',
        'phone',
        'email',
        'status',
        'tier',
        'totalOrders',
        'totalSpend',
        'isPhoneVerified',
        'lastOrderAt',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
      skip: (opts.page - 1) * opts.limit,
      take: opts.limit,
    });

    return {
      data,
      meta: {
        total,
        page: opts.page,
        limit: opts.limit,
        totalPages: Math.ceil(total / opts.limit),
        hasNextPage: opts.page * opts.limit < total,
        hasPrevPage: opts.page > 1,
      },
    };
  }

  async getCustomerDetail(customerId: string) {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId },
      select: [
        'id',
        'name',
        'phone',
        'email',
        'profileImage',
        'dateOfBirth',
        'gender',
        'status',
        'tier',
        'isPhoneVerified',
        'isEmailVerified',
        'referralCode',
        'referredByCode',
        'totalOrders',
        'totalSpend',
        'lastOrderAt',
        'lastLoginAt',
        'createdAt',
        'updatedAt',
      ],
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const wallet = await this.walletRepo.findOne({ where: { customerId } });

    return {
      ...customer,
      wallet: wallet
        ? { balance: wallet.balance, cashbackBalance: wallet.cashbackBalance, isActive: wallet.isActive }
        : null,
    };
  }

  async updateCustomerStatus(customerId: string, dto: UpdateCustomerStatusDto) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    customer.status = dto.status;
    await this.customerRepo.save(customer);
    return { id: customer.id, status: customer.status };
  }

  // ─── Customer Orders ─────────────────────────────────────────────────────────

  async getCustomerOrders(
    customerId: string,
    page: number,
    limit: number,
    status?: CustomerOrderStatus,
  ) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const where: any = { customerId };
    if (status) where.status = status;

    const [data, total] = await this.orderRepo.findAndCount({
      where,
      relations: ['items'],
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

  async getCustomerTickets(
    customerId: string,
    page: number,
    limit: number,
    status?: CustomerTicketStatus,
  ) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const where: any = { customerId };
    if (status) where.status = status;

    const [data, total] = await this.ticketRepo.findAndCount({
      where,
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

  // ─── All Orders ───────────────────────────────────────────────────────────────

  async listAllOrders(opts: {
    page: number;
    limit: number;
    status?: CustomerOrderStatus;
    restaurantId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoin('o.customer', 'customer')
      .leftJoinAndSelect('o.restaurant', 'restaurant')
      .addSelect(['customer.id', 'customer.name', 'customer.phone'])
      .orderBy('o.createdAt', 'DESC');

    if (opts.status) qb.andWhere('o.status = :status', { status: opts.status });
    if (opts.restaurantId) qb.andWhere('o.restaurantId = :restaurantId', { restaurantId: opts.restaurantId });
    if (opts.search) {
      qb.andWhere('o.orderNumber ILIKE :search', { search: `%${opts.search}%` });
    }
    if (opts.dateFrom) qb.andWhere('o.createdAt >= :dateFrom', { dateFrom: opts.dateFrom });
    if (opts.dateTo) qb.andWhere('o.createdAt <= :dateTo', { dateTo: opts.dateTo });

    const total = await qb.getCount();
    const data = await qb
      .leftJoinAndSelect('o.branch', 'branch')
      .skip((opts.page - 1) * opts.limit)
      .take(opts.limit)
      .getMany();

    // normalize amount and expose a simple `restaurant` label (prefer branch name)
    const normalized = data.map((o: any) => ({
      ...o,
      amount: o.grandTotal !== undefined ? Number(o.grandTotal) : 0,
      restaurantLabel: o.branch?.name ?? o.restaurant?.name ?? null,
      branchLabel: o.branch?.name ?? null,
    }));

    return {
      data: normalized,
      meta: {
        total,
        page: opts.page,
        limit: opts.limit,
        totalPages: Math.ceil(total / opts.limit),
        hasNextPage: opts.page * opts.limit < total,
        hasPrevPage: opts.page > 1,
      },
    };
  }

  async getOrderDetail(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'statusHistory', 'customer', 'restaurant', 'branch'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(orderId: string, status: CustomerOrderStatus) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const terminal = [CustomerOrderStatus.DELIVERED, CustomerOrderStatus.CANCELLED];
    if (terminal.includes(order.status as CustomerOrderStatus)) {
      throw new BadRequestException(`Order is already ${order.status} and cannot be updated`);
    }

    await this.orderRepo.update(orderId, { status });

    const entry = this.historyRepo.create({ orderId, status });
    await this.historyRepo.save(entry);

    this.trackingGateway?.emitOrderStatusUpdate(orderId, status);

    return { id: orderId, status };
  }

  async getRestaurantOrderDetail(orderId: string, restaurantId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, restaurantId },
      relations: ['items', 'statusHistory', 'customer', 'restaurant', 'branch'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ─── Restaurant Admin Orders ──────────────────────────────────────────────────

  async listRestaurantBranchOrders(opts: {
    restaurantId: string;
    page: number;
    limit: number;
    statuses?: CustomerOrderStatus[];
    branchId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    if (!opts.restaurantId) throw new NotFoundException('Restaurant not found');

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoin('o.customer', 'customer')
      .leftJoinAndSelect('o.restaurant', 'restaurant')
      .leftJoinAndSelect('o.branch', 'branch')
      .addSelect(['customer.id', 'customer.name', 'customer.phone'])
      .where('o.restaurantId = :restaurantId', { restaurantId: opts.restaurantId })
      .orderBy('o.createdAt', 'DESC');

    if (opts.statuses?.length) qb.andWhere('o.status IN (:...statuses)', { statuses: opts.statuses });
    if (opts.branchId) qb.andWhere('o.branchId = :branchId', { branchId: opts.branchId });
    if (opts.search) {
      qb.andWhere('o.orderNumber ILIKE :search', { search: `%${opts.search}%` });
    }
    if (opts.dateFrom) qb.andWhere('o.createdAt >= :dateFrom', { dateFrom: opts.dateFrom });
    if (opts.dateTo) qb.andWhere('o.createdAt <= :dateTo', { dateTo: opts.dateTo });

    const total = await qb.getCount();
    const data = await qb
      .skip((opts.page - 1) * opts.limit)
      .take(opts.limit)
      .getMany();

    const normalized = data.map((o: any) => ({
      ...o,
      amount: o.grandTotal !== undefined ? Number(o.grandTotal) : 0,
      restaurantLabel: o.branch?.name ?? o.restaurant?.name ?? null,
      branchLabel: o.branch?.name ?? null,
    }));

    return {
      data: normalized,
      meta: {
        total,
        page: opts.page,
        limit: opts.limit,
        totalPages: Math.ceil(total / opts.limit),
        hasNextPage: opts.page * opts.limit < total,
        hasPrevPage: opts.page > 1,
      },
    };
  }

  // ─── All Support Tickets ──────────────────────────────────────────────────────

  async listAllTickets(opts: {
    page: number;
    limit: number;
    status?: CustomerTicketStatus;
    type?: CustomerTicketType;
    priority?: CustomerTicketPriority;
    search?: string;
  }) {
    let qb = this.ticketRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.customer', 'customer');

    let hasWhereCondition = false;

    if (opts.status) {
      qb = qb.where('ticket.status = :status', { status: opts.status });
      hasWhereCondition = true;
    }
    if (opts.type) {
      const method = hasWhereCondition ? 'andWhere' : 'where';
      qb = qb[method]('ticket.type = :type', { type: opts.type });
      hasWhereCondition = true;
    }
    if (opts.priority) {
      const method = hasWhereCondition ? 'andWhere' : 'where';
      qb = qb[method]('ticket.priority = :priority', { priority: opts.priority });
      hasWhereCondition = true;
    }
    if (opts.search) {
      const method = hasWhereCondition ? 'andWhere' : 'where';
      qb = qb[method]('ticket.ticketNumber ILIKE :search', { search: `%${opts.search}%` });
    }

    qb = qb.orderBy('ticket.createdAt', 'DESC')
      .skip((opts.page - 1) * opts.limit)
      .take(opts.limit);

    const [data, total] = await qb.getManyAndCount();

    const normalized = data.map((ticket) => ({
      ...ticket,
      customerName: ticket.customer?.name ?? null,
    }));

    return {
      data: normalized,
      meta: {
        total,
        page: opts.page,
        limit: opts.limit,
        totalPages: Math.ceil(total / opts.limit),
        hasNextPage: opts.page * opts.limit < total,
        hasPrevPage: opts.page > 1,
      },
    };
  }

  async getTicketDetail(ticketId: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId }, relations: ['customer'] });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return {
      ...ticket,
      customerName: ticket.customer?.name ?? null,
    };
  }

  async updateTicket(ticketId: string, dto: UpdateTicketDto) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (dto.status) ticket.status = dto.status;
    if (dto.priority) ticket.priority = dto.priority;
    if (dto.adminNote !== undefined) ticket.adminNote = dto.adminNote;

    if (
      dto.status === CustomerTicketStatus.RESOLVED ||
      dto.status === CustomerTicketStatus.CLOSED
    ) {
      ticket.resolvedAt = new Date();
    }

    return this.ticketRepo.save(ticket);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  async getCustomerStats() {
    const totalCustomers = await this.customerRepo.count();
    const activeCustomers = await this.customerRepo.count({ where: { status: CustomerStatus.ACTIVE } });
    const suspendedCustomers = await this.customerRepo.count({ where: { status: CustomerStatus.SUSPENDED } });
    const bannedCustomers = await this.customerRepo.count({ where: { status: CustomerStatus.BANNED } });

    const tierCounts = await this.customerRepo
      .createQueryBuilder('c')
      .select('c.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.tier')
      .getRawMany();

    const totalOrders = await this.orderRepo.count();
    const openTickets = await this.ticketRepo.count({ where: { status: CustomerTicketStatus.OPEN } });
    const inProgressTickets = await this.ticketRepo.count({ where: { status: CustomerTicketStatus.IN_PROGRESS } });

    return {
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        suspended: suspendedCustomers,
        banned: bannedCustomers,
        byTier: tierCounts.reduce((acc: Record<string, number>, row) => {
          acc[row.tier] = parseInt(row.count, 10);
          return acc;
        }, {}),
      },
      orders: {
        total: totalOrders,
      },
      tickets: {
        open: openTickets,
        inProgress: inProgressTickets,
      },
    };
  }
}
