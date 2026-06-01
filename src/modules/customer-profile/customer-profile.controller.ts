import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CustomerProfileService } from './customer-profile.service';
import { CustomerJwtGuard } from '../customer-auth/guards/customer-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerJwtPayload } from '../customer-auth/strategies/customer-jwt.strategy';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('customer/profile')
@UseGuards(CustomerJwtGuard)
export class CustomerProfileController {
  constructor(private readonly profileService: CustomerProfileService) {}

  @Get()
  getProfile(@CurrentUser() c: CustomerJwtPayload) {
    return this.profileService.getProfile(c.sub);
  }

  @Patch()
  updateProfile(@CurrentUser() c: CustomerJwtPayload, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(c.sub, dto);
  }

  @Patch('image')
  updateImage(@CurrentUser() c: CustomerJwtPayload, @Body('imageKey') imageKey: string) {
    return this.profileService.updateProfileImage(c.sub, imageKey);
  }

  // ─── Addresses ────────────────────────────────────────────────────

  @Get('addresses')
  getAddresses(@CurrentUser() c: CustomerJwtPayload) {
    return this.profileService.getAddresses(c.sub);
  }

  @Post('addresses')
  addAddress(@CurrentUser() c: CustomerJwtPayload, @Body() dto: CreateAddressDto) {
    return this.profileService.addAddress(c.sub, dto);
  }

  @Patch('addresses/:id')
  updateAddress(
    @CurrentUser() c: CustomerJwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.profileService.updateAddress(c.sub, id, dto);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser() c: CustomerJwtPayload, @Param('id') id: string) {
    return this.profileService.deleteAddress(c.sub, id);
  }

  @Patch('addresses/:id/set-default')
  setDefault(@CurrentUser() c: CustomerJwtPayload, @Param('id') id: string) {
    return this.profileService.setDefaultAddress(c.sub, id);
  }

  // ─── Favorites — Restaurants ─────────────────────────────────────

  @Get('favorites/restaurants')
  getFavRestaurants(@CurrentUser() c: CustomerJwtPayload) {
    return this.profileService.getFavoriteRestaurants(c.sub);
  }

  @Post('favorites/restaurants/:restaurantId')
  addFavRestaurant(
    @CurrentUser() c: CustomerJwtPayload,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.profileService.addFavoriteRestaurant(c.sub, restaurantId);
  }

  @Delete('favorites/restaurants/:restaurantId')
  removeFavRestaurant(
    @CurrentUser() c: CustomerJwtPayload,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.profileService.removeFavoriteRestaurant(c.sub, restaurantId);
  }

  // ─── Favorites — Items ────────────────────────────────────────────

  @Get('favorites/items')
  getFavItems(@CurrentUser() c: CustomerJwtPayload) {
    return this.profileService.getFavoriteItems(c.sub);
  }

  @Post('favorites/items/:menuItemId')
  addFavItem(
    @CurrentUser() c: CustomerJwtPayload,
    @Param('menuItemId') menuItemId: string,
    @Body('restaurantId') restaurantId: string,
  ) {
    return this.profileService.addFavoriteItem(c.sub, menuItemId, restaurantId);
  }

  @Delete('favorites/items/:menuItemId')
  removeFavItem(@CurrentUser() c: CustomerJwtPayload, @Param('menuItemId') menuItemId: string) {
    return this.profileService.removeFavoriteItem(c.sub, menuItemId);
  }
}
