import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { CustomerDiscoveryService } from './customer-discovery.service';
import { NearbyRestaurantsDto } from './dto/nearby-restaurants.dto';
import { SearchDto } from './dto/search.dto';

@Controller('customer/discovery')
export class CustomerDiscoveryController {
  constructor(private readonly discoveryService: CustomerDiscoveryService) {}

  @Get('nearby')
  getNearby(@Query() dto: NearbyRestaurantsDto) {
    return this.discoveryService.getNearbyRestaurants(dto);
  }

  @Get('search')
  search(@Query() dto: SearchDto) {
    return this.discoveryService.search(dto);
  }

  @Get('trending')
  getTrending(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.discoveryService.getTrendingRestaurants(parseFloat(lat), parseFloat(lng));
  }

  @Get('popular-dishes')
  getPopularDishes(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.discoveryService.getPopularDishes(parseFloat(lat ?? '0'), parseFloat(lng ?? '0'));
  }

  @Get('restaurants/:branchId')
  getRestaurantDetails(@Param('branchId', ParseUUIDPipe) branchId: string) {
    return this.discoveryService.getRestaurantDetails(branchId);
  }

  @Get('restaurants/:branchId/menu')
  getMenu(@Param('branchId', ParseUUIDPipe) branchId: string) {
    return this.discoveryService.getRestaurantMenu(branchId);
  }
}
