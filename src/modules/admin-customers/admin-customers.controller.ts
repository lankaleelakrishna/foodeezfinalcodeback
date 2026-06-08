import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminCustomersService } from './admin-customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CustomerStatus, CustomerTier } from '../../entities/customer.entity';
import { CustomerOrderStatus } from '../../entities/customer-order.entity';
import {
  CustomerTicketStatus,
  CustomerTicketType,
  CustomerTicketPriority,
} from '../../entities/customer-support-ticket.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// ─── /admin/customers ─────────────────────────────────────────────────────────

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin)
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private readonly service: AdminCustomersService) {}

  @Get('stats')
  getStats() {
    return this.service.getCustomerStats();
  }

  @Get()
  listCustomers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: CustomerStatus,
    @Query('tier') tier?: CustomerTier,
  ) {
    return this.service.listCustomers({ page, limit, search, status, tier });
  }

  @Get(':customerId')
  getCustomer(@Param('customerId') customerId: string) {
    return this.service.getCustomerDetail(customerId);
  }

  @Patch(':customerId/status')
  updateCustomerStatus(
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerStatusDto,
  ) {
    return this.service.updateCustomerStatus(customerId, dto);
  }

  @Get(':customerId/orders')
  getCustomerOrders(
    @Param('customerId') customerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: CustomerOrderStatus,
  ) {
    return this.service.getCustomerOrders(customerId, page, limit, status);
  }

  @Get(':customerId/tickets')
  getCustomerTickets(
    @Param('customerId') customerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: CustomerTicketStatus,
  ) {
    return this.service.getCustomerTickets(customerId, page, limit, status);
  }
}

// ─── /admin/orders ────────────────────────────────────────────────────────────

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly service: AdminCustomersService) {}

  @Get()
  listOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: CustomerOrderStatus,
    @Query('restaurantId') restaurantId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.listAllOrders({ page, limit, status, restaurantId, search, dateFrom, dateTo });
  }

  @Get(':orderId')
  getOrder(@Param('orderId') orderId: string) {
    return this.service.getOrderDetail(orderId);
  }

  @Patch(':orderId/status')
  updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body('status') status: CustomerOrderStatus,
  ) {
    return this.service.updateOrderStatus(orderId, status);
  }
}

// ─── /restaurant/orders ───────────────────────────────────────────────────────

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RestaurantAdmin)
@Controller('restaurant/orders')
export class RestaurantOrdersController {
  constructor(private readonly service: AdminCustomersService) {}

  @Get()
  listRestaurantBranchOrders(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const restaurantId = user?.restaurant?.id;
    // Parse comma-separated status values
    const statusArray = status
      ? status.split(',').map((s) => s.trim() as CustomerOrderStatus)
      : undefined;
    return this.service.listRestaurantBranchOrders({
      restaurantId,
      page,
      limit,
      statuses: statusArray,
      branchId,
      search,
      dateFrom,
      dateTo,
    });
  }

  @Get(':orderId')
  getOrder(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    const restaurantId = user?.restaurant?.id;
    return this.service.getRestaurantOrderDetail(orderId, restaurantId);
  }
}

// ─── /admin/tickets ───────────────────────────────────────────────────────────

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin)
@Controller('admin/tickets')
export class AdminTicketsController {
  constructor(private readonly service: AdminCustomersService) {}

  @Get()
  listTickets(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: CustomerTicketStatus,
    @Query('type') type?: CustomerTicketType,
    @Query('priority') priority?: CustomerTicketPriority,
    @Query('search') search?: string,
  ) {
    return this.service.listAllTickets({ page, limit, status, type, priority, search });
  }

  @Get(':ticketId')
  getTicket(@Param('ticketId') ticketId: string) {
    return this.service.getTicketDetail(ticketId);
  }

  @Patch(':ticketId')
  updateTicket(@Param('ticketId') ticketId: string, @Body() dto: UpdateTicketDto) {
    return this.service.updateTicket(ticketId, dto);
  }
}