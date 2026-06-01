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
import { CustomerReviewsService } from './customer-reviews.service';
import { CustomerJwtGuard } from '../customer-auth/guards/customer-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerJwtPayload } from '../customer-auth/strategies/customer-jwt.strategy';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('customer/reviews')
export class CustomerReviewsController {
  constructor(private readonly reviewsService: CustomerReviewsService) {}

  @Post()
  @UseGuards(CustomerJwtGuard)
  createReview(@CurrentUser() c: CustomerJwtPayload, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(c.sub, dto);
  }

  @Get('restaurant/:restaurantId')
  getRestaurantReviews(
    @Param('restaurantId') restaurantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getRestaurantReviews(restaurantId, page, limit);
  }

  @Post(':reviewId/helpful')
  @UseGuards(CustomerJwtGuard)
  markHelpful(@CurrentUser() c: CustomerJwtPayload, @Param('reviewId') reviewId: string) {
    return this.reviewsService.markHelpful(c.sub, reviewId);
  }
}
