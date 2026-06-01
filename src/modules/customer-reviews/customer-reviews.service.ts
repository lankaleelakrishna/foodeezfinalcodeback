import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerReviewEntity } from '../../entities/customer-review.entity';
import { CustomerOrderEntity, CustomerOrderStatus } from '../../entities/customer-order.entity';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class CustomerReviewsService {
  constructor(
    @InjectRepository(CustomerReviewEntity)
    private readonly reviewRepo: Repository<CustomerReviewEntity>,
    @InjectRepository(CustomerOrderEntity)
    private readonly orderRepo: Repository<CustomerOrderEntity>,
    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepo: Repository<DeliveryPartnerEntity>,
  ) {}

  async createReview(customerId: string, dto: CreateReviewDto): Promise<CustomerReviewEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== CustomerOrderStatus.DELIVERED) {
      throw new BadRequestException('You can only review a delivered order');
    }

    const existing = await this.reviewRepo.findOne({ where: { orderId: dto.orderId } });
    if (existing) throw new ConflictException('You have already reviewed this order');

    const review = this.reviewRepo.create({
      customerId,
      orderId: dto.orderId,
      restaurantId: order.restaurantId,
      deliveryPartnerId: order.deliveryPartnerId,
      restaurantRating: dto.restaurantRating,
      deliveryRating: dto.deliveryRating,
      foodRating: dto.foodRating,
      reviewText: dto.reviewText,
      imageUrls: dto.imageUrls,
      isAnonymous: dto.isAnonymous ?? false,
      isApproved: true,
    });

    const saved = await this.reviewRepo.save(review);

    // Update delivery partner rating if delivery rating provided
    if (dto.deliveryRating && order.deliveryPartnerId) {
      const partner = await this.partnerRepo.findOne({
        where: { id: order.deliveryPartnerId },
      });
      if (partner) {
        const totalPoints = Number(partner.rating) * partner.totalRatings + dto.deliveryRating;
        partner.totalRatings += 1;
        partner.rating = totalPoints / partner.totalRatings;
        await this.partnerRepo.save(partner);
      }
    }

    return saved;
  }

  async getRestaurantReviews(
    restaurantId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: CustomerReviewEntity[]; meta: object; avgRating: number }> {
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { restaurantId, isApproved: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const avgResult = await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.restaurant_id = :restaurantId AND r.is_approved = true', { restaurantId })
      .select('AVG(r.restaurant_rating)', 'avg')
      .getRawOne();

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
      avgRating: avgResult?.avg ? Math.round(Number(avgResult.avg) * 10) / 10 : 0,
    };
  }

  async markHelpful(customerId: string, reviewId: string): Promise<{ helpfulCount: number }> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    await this.reviewRepo.increment({ id: reviewId }, 'helpfulCount', 1);
    return { helpfulCount: review.helpfulCount + 1 };
  }
}
