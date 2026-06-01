import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { RestaurantEntity } from '../../entities/restaurant.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(RestaurantEntity)
    private readonly restaurantRepository: Repository<RestaurantEntity>,
  ) {}

  async create(restaurantId: string, payload: CreateBranchDto) {
    const restaurant = await this.restaurantRepository.findOne({ where: { id: restaurantId } });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    const branch = this.branchRepository.create({ ...payload, restaurant });
    return this.branchRepository.save(branch);
  }

  async findByRestaurant(restaurantId: string) {
    return this.branchRepository.find({ where: { restaurant: { id: restaurantId } } });
  }

  async findOne(id: string) {
    const branch = await this.branchRepository.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }

  async update(id: string, payload: UpdateBranchDto) {
    const branch = await this.findOne(id);
    Object.assign(branch, payload);
    return this.branchRepository.save(branch);
  }
}
