import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { MenuItemEntity } from '../../entities/menu-item.entity';
import { MenuCategoryEntity } from '../../entities/menu-category.entity';
import { NearbyRestaurantsDto } from './dto/nearby-restaurants.dto';
import { SearchDto } from './dto/search.dto';

@Injectable()
export class CustomerDiscoveryService {
  private readonly BASE_DELIVERY_FEE = 30;

  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepo: Repository<BranchEntity>,
    @InjectRepository(MenuItemEntity)
    private readonly menuItemRepo: Repository<MenuItemEntity>,
    @InjectRepository(MenuCategoryEntity)
    private readonly menuCategoryRepo: Repository<MenuCategoryEntity>,
  ) {}

  async getNearbyRestaurants(dto: NearbyRestaurantsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const radius = dto.radius ?? 10;

    const qb = this.branchRepo
      .createQueryBuilder('branch')
      .leftJoinAndSelect('branch.restaurant', 'restaurant')
      .addSelect(
        `(6371 * acos(LEAST(1, cos(radians(:lat)) * cos(radians(CAST(branch.latitude AS float))) * cos(radians(CAST(branch.longitude AS float)) - radians(:lng)) + sin(radians(:lat)) * sin(radians(CAST(branch.latitude AS float))))))`,
        'distance_km',
      )
      .where('COALESCE(branch.temporaryClosure, false) = false')
      .andWhere('restaurant.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: ['review', 'rejected'],
      })
      .andWhere('restaurant.lead_status NOT IN (:...excludedLeadStatuses)', {
        excludedLeadStatuses: ['REVIEW', 'REJECTED'],
      })
      .andWhere('branch.latitude IS NOT NULL')
      .andWhere('branch.longitude IS NOT NULL')
      .andWhere(
        `(6371 * acos(LEAST(1, cos(radians(:lat)) * cos(radians(CAST(branch.latitude AS float))) * cos(radians(CAST(branch.longitude AS float)) - radians(:lng)) + sin(radians(:lat)) * sin(radians(CAST(branch.latitude AS float)))))) <= :radius`,
      )
      .setParameters({ lat: dto.lat, lng: dto.lng, radius })
      .orderBy('distance_km', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (dto.cuisine) {
      qb.andWhere('restaurant.cuisineTags::text ILIKE :cuisine', {
        cuisine: `%${dto.cuisine}%`,
      });
    }

    if (dto.isVeg) {
      qb.andWhere('restaurant.cuisineTags::text ILIKE :vegTag', { vegTag: '%veg%' });
    }

    const [branches, total] = await qb.getManyAndCount();

    const data = branches.map((b) => this.formatBranchResponse(b));

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

  async search(dto: SearchDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const term = `%${dto.q}%`;

    const [restaurants, dishes] = await Promise.all([
      this.branchRepo
        .createQueryBuilder('branch')
        .leftJoinAndSelect('branch.restaurant', 'restaurant')
        .where('COALESCE(branch.temporaryClosure, false) = false')
        .andWhere('restaurant.status NOT IN (:...excludedStatuses)', {
          excludedStatuses: ['review', 'rejected'],
        })
        .andWhere('restaurant.lead_status NOT IN (:...excludedLeadStatuses)', {
          excludedLeadStatuses: ['REVIEW', 'REJECTED'],
        })
        .andWhere(
          '(restaurant.name ILIKE :term OR branch.name ILIKE :term OR restaurant.cuisine_tags::text ILIKE :term)',
          { term },
        )
        .orderBy('branch.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount(),

      this.menuItemRepo
        .createQueryBuilder('item')
        .leftJoinAndSelect('item.branch', 'branch')
        .leftJoinAndSelect('item.category', 'category')
        .leftJoinAndSelect('item.pricingRules', 'pricingRules')
        .leftJoinAndSelect('branch.restaurant', 'restaurant')
        .where('item.isVisible = true')
        .andWhere('item.isInStock = true')
        .andWhere('restaurant.status NOT IN (:...excludedStatuses)', {
          excludedStatuses: ['review', 'rejected'],
        })
        .andWhere('restaurant.lead_status NOT IN (:...excludedLeadStatuses)', {
          excludedLeadStatuses: ['REVIEW', 'REJECTED'],
        })
        .andWhere('(item.name ILIKE :term OR item.description ILIKE :term)', { term })
        .orderBy('item.sortOrder', 'ASC')
        .take(30)
        .getManyAndCount(),
    ]);

    return {
      restaurants: {
        data: restaurants[0].map((b) => this.formatBranchResponse(b)),
        total: restaurants[1],
      },
      dishes: {
        data: dishes[0],
        total: dishes[1],
      },
    };
  }

  async getTrendingRestaurants(lat: number, lng: number) {
    const branches = await this.branchRepo
      .createQueryBuilder('branch')
      .leftJoinAndSelect('branch.restaurant', 'restaurant')
      .addSelect(
        `(6371 * acos(LEAST(1, cos(radians(:lat)) * cos(radians(CAST(branch.latitude AS float))) * cos(radians(CAST(branch.longitude AS float)) - radians(:lng)) + sin(radians(:lat)) * sin(radians(CAST(branch.latitude AS float))))))`,
        'distance_km',
      )
      .where('COALESCE(branch.temporaryClosure, false) = false')
      .andWhere('restaurant.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: ['review', 'rejected'],
      })
      .andWhere('restaurant.lead_status NOT IN (:...excludedLeadStatuses)', {
        excludedLeadStatuses: ['REVIEW', 'REJECTED'],
      })
      .andWhere(
        `(6371 * acos(LEAST(1, cos(radians(:lat)) * cos(radians(CAST(branch.latitude AS float))) * cos(radians(CAST(branch.longitude AS float)) - radians(:lng)) + sin(radians(:lat)) * sin(radians(CAST(branch.latitude AS float)))))) <= 15`,
      )
      .setParameters({ lat, lng })
      .orderBy('distance_km', 'ASC')
      .take(15)
      .getMany();

    return branches.map((b) => this.formatBranchResponse(b));
  }

  async getRestaurantDetails(branchId: string) {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
      relations: ['restaurant'],
    });
    if (
      !branch ||
      branch.restaurant?.status === 'review' ||
      branch.restaurant?.status === 'rejected' ||
      branch.restaurant?.leadStatus === 'REVIEW' ||
      branch.restaurant?.leadStatus === 'REJECTED'
    ) {
      throw new NotFoundException('Restaurant not found');
    }
    return this.formatBranchResponse(branch);
  }

  async getRestaurantMenu(branchId: string) {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
      relations: ['restaurant'],
    });
    if (
      !branch ||
      branch.restaurant?.status === 'review' ||
      branch.restaurant?.status === 'rejected' ||
      branch.restaurant?.leadStatus === 'REVIEW' ||
      branch.restaurant?.leadStatus === 'REJECTED'
    ) {
      throw new NotFoundException('Restaurant not found');
    }

    const categories = await this.menuCategoryRepo
      .createQueryBuilder('cat')
      .innerJoin('cat.branch', 'branch')
      .leftJoinAndSelect('cat.items', 'item', 'item.is_visible = true')
      .leftJoinAndSelect('item.addons', 'addon')
      .leftJoinAndSelect('item.pricingRules', 'pricingRule')
      .where('branch.id = :branchId', { branchId })
      .orderBy('item.sortOrder', 'ASC')
      .getMany();

    return { branchId, categories };
  }

  async getPopularDishes(_lat: number, _lng: number) {
    return this.menuItemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.branch', 'branch')
      .leftJoinAndSelect('item.pricingRules', 'pricingRules')
      .leftJoinAndSelect('branch.restaurant', 'restaurant')
      .where('item.isVisible = true')
      .andWhere('item.isInStock = true')
      .andWhere('restaurant.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: ['review', 'rejected'],
      })
      .andWhere('restaurant.lead_status NOT IN (:...excludedLeadStatuses)', {
        excludedLeadStatuses: ['REVIEW', 'REJECTED'],
      })
      .orderBy('item.sortOrder', 'ASC')
      .take(20)
      .getMany();
  }

  private formatBranchResponse(branch: BranchEntity & { distance_km?: number }) {
    return {
      id: branch.id,
      branchId: branch.id,
      name: branch.name,
      address: branch.address,
      city: branch.city,
      latitude: branch.latitude,
      longitude: branch.longitude,
      openingTime: branch.openingTime,
      closingTime: branch.closingTime,
      isOnline: branch.isOnline,
      busyMode: branch.busyMode,
      deliveryRadiusKm: branch.deliveryRadiusKm,
      distanceKm: (branch as any).distance_km
        ? Number(Number((branch as any).distance_km).toFixed(1))
        : null,
      estimatedDeliveryTime: this.estimateDeliveryTime((branch as any).distance_km),
      deliveryFee: this.calculateDeliveryFee((branch as any).distance_km),
      restaurant: branch.restaurant
        ? {
            id: branch.restaurant.id,
            name: branch.restaurant.name,
            cuisineTags: branch.restaurant.cuisineTags,
            brandDescription: branch.restaurant.brandDescription,
            storePhotos: branch.restaurant.storePhotos,
          }
        : null,
    };
  }

  private estimateDeliveryTime(distanceKm?: number): number {
    if (!distanceKm) return 30;
    return Math.round(10 + distanceKm * 4);
  }

  private calculateDeliveryFee(distanceKm?: number): number {
    if (!distanceKm || distanceKm <= 3) return this.BASE_DELIVERY_FEE;
    return Math.round(this.BASE_DELIVERY_FEE + (distanceKm - 3) * 5);
  }
}
