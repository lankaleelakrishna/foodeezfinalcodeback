import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { MenuItemEntity } from '../../entities/menu-item.entity';
import { MenuCategoryEntity } from '../../entities/menu-category.entity';
import { NearbyRestaurantsDto } from './dto/nearby-restaurants.dto';
import { SearchDto } from './dto/search.dto';
import { AppCacheService, TTL } from '../../cache/cache.service';

// ─────────────────────────────────────────────────────────────────────────────
// Swiggy / Zomato behaviour:
//   • ALL active restaurants are listed regardless of isOnline value.
//   • isOnline is returned in the payload so the frontend can show
//     "Currently unavailable" — but it never hides the card.
//   • Online restaurants sort before offline ones; within each group
//     the sort is by ascending distance.
//   • temporaryClosure=true is the ONLY flag that hides a branch.
//   • Only status='review'/'rejected' or leadStatus='REVIEW'/'REJECTED'
//     hide the restaurant (platform-level rejection).
// ─────────────────────────────────────────────────────────────────────────────

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
    private readonly cache: AppCacheService,
  ) {}

  // ── shared haversine SQL fragment ─────────────────────────────────────────
  private get haversine() {
    return `(6371 * acos(LEAST(1, cos(radians(:lat)) * cos(radians(CAST(branch.latitude AS float))) * cos(radians(CAST(branch.longitude AS float)) - radians(:lng)) + sin(radians(:lat)) * sin(radians(CAST(branch.latitude AS float))))))`;
  }

  // ── shared platform-level exclusion filters ───────────────────────────────
  private applyExclusionFilters(qb: any) {
    return qb
      // temporaryClosure is the ONLY flag that hides a branch from listing
      .andWhere('COALESCE(branch.temporaryClosure, false) = false')
      // exclude platform-rejected restaurants
      .andWhere("COALESCE(restaurant.status, '') NOT IN (:...excludedStatuses)", {
        excludedStatuses: ['review', 'rejected'],
      })
      .andWhere("COALESCE(CAST(restaurant.lead_status AS text), '') NOT IN (:...excludedLeadStatuses)", {
        excludedLeadStatuses: ['REVIEW', 'REJECTED'],
      });
  }

  async getNearbyRestaurants(dto: NearbyRestaurantsDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const cacheKey = `discovery:nearby:p${page}:l${limit}`;

    return this.cache.wrap(
      cacheKey,
      async () => {
        const branches = await this.branchRepo.find({
          where: { temporaryClosure: false },
          relations: ['restaurant'],
        });

        const filtered = branches.filter((b) => {
          const s  = (b.restaurant?.status    ?? '').toLowerCase();
          const ls = (b.restaurant?.leadStatus ?? '').toUpperCase();
          return s !== 'review' && s !== 'rejected' && ls !== 'REVIEW' && ls !== 'REJECTED';
        });

        const page1 = filtered.slice((page - 1) * limit, page * limit);

        return {
          data: page1.map((b) => this.formatBranchResponse(b)),
          meta: {
            total: filtered.length,
            page,
            limit,
            totalPages: Math.ceil(filtered.length / limit),
            hasNextPage: page * limit < filtered.length,
            hasPrevPage: page > 1,
          },
        };
      },
      TTL.MEDIUM,
    );
  }

  async search(dto: SearchDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const term  = `%${dto.q}%`;
    const cacheKey = `discovery:search:${encodeURIComponent(dto.q)}:p${page}:l${limit}`;

    return this.cache.wrap(
      cacheKey,
      async () => {
        const [restaurants, dishes] = await Promise.all([
          this.applyExclusionFilters(
            this.branchRepo
              .createQueryBuilder('branch')
              .leftJoinAndSelect('branch.restaurant', 'restaurant'),
          )
            .andWhere(
              '(restaurant.name ILIKE :term OR branch.name ILIKE :term OR restaurant.cuisine_tags::text ILIKE :term)',
              { term },
            )
            .orderBy('branch.isOnline', 'DESC')
            .addOrderBy('branch.createdAt', 'DESC')
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
            .andWhere("COALESCE(restaurant.status, '') NOT IN (:...excludedStatuses)", {
              excludedStatuses: ['review', 'rejected'],
            })
            .andWhere("COALESCE(CAST(restaurant.lead_status AS text), '') NOT IN (:...excludedLeadStatuses)", {
              excludedLeadStatuses: ['REVIEW', 'REJECTED'],
            })
            .andWhere('(item.name ILIKE :term OR item.description ILIKE :term)', { term })
            .orderBy('item.sortOrder', 'ASC')
            .take(30)
            .getManyAndCount(),
        ]);

        return {
          restaurants: {
            data: (restaurants[0] as BranchEntity[]).map((b: BranchEntity) => this.formatBranchResponse(b)),
            total: restaurants[1],
          },
          dishes: {
            data: dishes[0],
            total: dishes[1],
          },
        };
      },
      TTL.MEDIUM,
    );
  }

  async getTrendingRestaurants(lat: number, lng: number) {
    const cacheKey = `discovery:trending:${lat.toFixed(2)}:${lng.toFixed(2)}`;

    return this.cache.wrap(
      cacheKey,
      async () => {
        const branches = await this.applyExclusionFilters(
          this.branchRepo
            .createQueryBuilder('branch')
            .leftJoinAndSelect('branch.restaurant', 'restaurant')
            .addSelect(
              `CASE WHEN branch.latitude IS NOT NULL AND branch.longitude IS NOT NULL
                    THEN ${this.haversine} ELSE NULL END`,
              'distance_km',
            ),
        )
          .andWhere(
            `(branch.latitude IS NULL OR branch.longitude IS NULL
              OR ${this.haversine} <= COALESCE(CAST(restaurant.service_radius_km AS float), 50000))`,
          )
          .setParameters({ lat, lng })
          .orderBy('branch.isOnline', 'DESC')
          .addOrderBy('distance_km', 'ASC', 'NULLS LAST')
          .take(15)
          .getMany();

        return (branches as BranchEntity[]).map((b: BranchEntity) => this.formatBranchResponse(b));
      },
      TTL.MEDIUM,
    );
  }

  async getRestaurantDetails(branchId: string) {
    const cacheKey = `discovery:branch:${branchId}`;

    return this.cache.wrap(
      cacheKey,
      async () => {
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
      },
      TTL.LONG,
    );
  }

  async getRestaurantMenu(branchId: string) {
    const cacheKey = `discovery:menu:${branchId}`;

    return this.cache.wrap(
      cacheKey,
      async () => {
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
      },
      TTL.LONG,
    );
  }

  async getPopularDishes(_lat: number, _lng: number) {
    const cacheKey = `discovery:popular`;

    return this.cache.wrap(
      cacheKey,
      () =>
        this.menuItemRepo
          .createQueryBuilder('item')
          .leftJoinAndSelect('item.branch', 'branch')
          .leftJoinAndSelect('item.pricingRules', 'pricingRules')
          .leftJoinAndSelect('branch.restaurant', 'restaurant')
          .where('item.isVisible = true')
          .andWhere('item.isInStock = true')
          .andWhere("COALESCE(restaurant.status, '') NOT IN (:...excludedStatuses)", {
            excludedStatuses: ['review', 'rejected'],
          })
          .andWhere("COALESCE(CAST(restaurant.lead_status AS text), '') NOT IN (:...excludedLeadStatuses)", {
            excludedLeadStatuses: ['REVIEW', 'REJECTED'],
          })
          .orderBy('item.sortOrder', 'ASC')
          .take(20)
          .getMany(),
      TTL.MEDIUM,
    );
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
      isOnline: branch.isOnline,       // frontend uses this for "Unavailable" badge only
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
