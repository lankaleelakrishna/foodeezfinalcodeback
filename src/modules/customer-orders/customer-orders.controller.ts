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
import { CustomerOrdersService } from './customer-orders.service';
import { CustomerJwtGuard } from '../customer-auth/guards/customer-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerJwtPayload } from '../customer-auth/strategies/customer-jwt.strategy';
import { PlaceOrderDto } from './dto/place-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Controller('customer/orders')
@UseGuards(CustomerJwtGuard)
export class CustomerOrdersController {
  constructor(private readonly ordersService: CustomerOrdersService) {}

  @Post()
  placeOrder(@CurrentUser() c: CustomerJwtPayload, @Body() dto: PlaceOrderDto) {
    return this.ordersService.placeOrder(c.sub, dto);
  }

  @Get()
  getHistory(
    @CurrentUser() c: CustomerJwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.ordersService.getOrderHistory(c.sub, page, limit);
  }

  @Get(':orderId')
  getOrder(@CurrentUser() c: CustomerJwtPayload, @Param('orderId') orderId: string) {
    return this.ordersService.getOrderDetail(c.sub, orderId);
  }

  @Post(':orderId/cancel')
  cancelOrder(
    @CurrentUser() c: CustomerJwtPayload,
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(c.sub, orderId, dto);
  }

  @Post(':orderId/reorder')
  reorder(@CurrentUser() c: CustomerJwtPayload, @Param('orderId') orderId: string) {
    return this.ordersService.reorder(c.sub, orderId);
  }

  @Get(':orderId/tracking')
  getTracking(@CurrentUser() c: CustomerJwtPayload, @Param('orderId') orderId: string) {
    return this.ordersService.getLiveTrackingData(c.sub, orderId);
  }

  @Get(':orderId/invoice')
  getInvoice(@CurrentUser() c: CustomerJwtPayload, @Param('orderId') orderId: string) {
    return this.ordersService.generateInvoice(c.sub, orderId);
  }
}
