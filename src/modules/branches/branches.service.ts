import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { RestaurantEntity } from '../../entities/restaurant.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AppCacheService, TTL } from '../../cache/cache.service';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(RestaurantEntity)
    private readonly restaurantRepository: Repository<RestaurantEntity>,
    private readonly cache: AppCacheService,
  ) {}

  private branchKey(id: string)             { return `branch:${id}`; }
  private restaurantBranchesKey(id: string) { return `branch:restaurant:${id}`; }

  async create(restaurantId: string, payload: CreateBranchDto) {
    const restaurant = await this.restaurantRepository.findOne({ where: { id: restaurantId } });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    const branch = this.branchRepository.create({ ...payload, restaurant });
    const saved = await this.branchRepository.save(branch);
    await this.cache.del(this.restaurantBranchesKey(restaurantId));
    return saved;
  }

  async findByRestaurant(restaurantId: string) {
    return this.cache.wrap(
      this.restaurantBranchesKey(restaurantId),
      () => this.branchRepository.find({ where: { restaurant: { id: restaurantId } } }),
      TTL.LONG,
    );
  }

  async findOne(id: string) {
    return this.cache.wrap(
      this.branchKey(id),
      async () => {
        const branch = await this.branchRepository.findOne({ where: { id } });
        if (!branch) {
          throw new NotFoundException('Branch not found');
        }
        return branch;
      },
      TTL.LONG,
    );
  }

  async update(id: string, payload: UpdateBranchDto) {
    const branch = await this.branchRepository.findOne({ where: { id }, relations: ['restaurant'] });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    Object.assign(branch, payload);
    const saved = await this.branchRepository.save(branch);
    await Promise.all([
      this.cache.del(this.branchKey(id)),
      this.cache.del(this.restaurantBranchesKey(branch.restaurant?.id)),
      // also bust the customer-facing discovery cache for this branch
      this.cache.del(`discovery:branch:${id}`),
    ]);
    return saved;
  }
}
