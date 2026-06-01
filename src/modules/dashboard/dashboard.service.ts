import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { RestaurantEntity } from '../../entities/restaurant.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(RestaurantEntity)
    private readonly restaurantRepository: Repository<RestaurantEntity>,
  ) {}

  async getRestaurantSummary(restaurantId: string) {
    const restaurant = await this.restaurantRepository.findOne({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const branches = await this.branchRepository.find({
      where: { restaurant: { id: restaurantId } },
    });

    const activeBranches = branches.filter((b) => b.isOnline).length;

    return {
      restaurantId,
      restaurantName: restaurant.name,
      status: restaurant.status,
      onboardingStep: restaurant.onboardingStep,
      leadStatus: restaurant.leadStatus,
      activeBranches,
      offlineBranches: branches.length - activeBranches,
      totalBranches: branches.length,
      branchMetrics: branches.map((b) => ({
        id: b.id,
        name: b.name,
        isOnline: b.isOnline,
        openingTime: b.openingTime ?? null,
        closingTime: b.closingTime ?? null,
        busyMode: b.busyMode,
        temporaryClosure: b.temporaryClosure,
      })),
    };
  }

  async getAdminSummary() {
    const restaurants = await this.restaurantRepository.find({ order: { createdAt: 'DESC' } });

    const statusCounts = restaurants.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRestaurants: restaurants.length,
      statusBreakdown: statusCounts,
      recentRestaurants: restaurants.slice(0, 10).map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        leadStatus: r.leadStatus,
        onboardingStep: r.onboardingStep,
        createdAt: r.createdAt,
      })),
    };
  }
}
