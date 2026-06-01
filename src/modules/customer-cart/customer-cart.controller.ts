import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CustomerCartService } from './customer-cart.service';
import { CustomerJwtGuard } from '../customer-auth/guards/customer-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerJwtPayload } from '../customer-auth/strategies/customer-jwt.strategy';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@Controller('customer/cart')
@UseGuards(CustomerJwtGuard)
export class CustomerCartController {
  constructor(private readonly cartService: CustomerCartService) {}

  @Get()
  getCart(@CurrentUser() c: CustomerJwtPayload) {
    return this.cartService.getCart(c.sub);
  }

  @Post('items')
  async addItem(@CurrentUser() c: CustomerJwtPayload, @Body() dto: AddToCartDto) {
    try {
      return await this.cartService.addItem(c.sub, dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add item to cart';
      const responseError = (error as any)?.response?.error ?? message;
      throw new BadRequestException({
        message,
        error: responseError,
      });
    }
  }

  @Patch('items/:itemId')
  updateItem(
    @CurrentUser() c: CustomerJwtPayload,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(c.sub, itemId, dto);
  }

  @Delete('items/:itemId')
  removeItem(@CurrentUser() c: CustomerJwtPayload, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(c.sub, itemId);
  }

  @Delete()
  clearCart(@CurrentUser() c: CustomerJwtPayload) {
    return this.cartService.clearCart(c.sub);
  }

  @Post('coupon')
  @HttpCode(HttpStatus.OK)
  applyCoupon(@CurrentUser() c: CustomerJwtPayload, @Body() dto: ApplyCouponDto) {
    return this.cartService.applyCoupon(c.sub, dto);
  }

  @Delete('coupon')
  removeCoupon(@CurrentUser() c: CustomerJwtPayload) {
    return this.cartService.removeCoupon(c.sub);
  }
}
