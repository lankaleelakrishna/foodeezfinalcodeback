import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CustomerEntity } from '../../entities/customer.entity';
import { CustomerAddressEntity } from '../../entities/customer-address.entity';
import { CustomerFavoriteRestaurantEntity } from '../../entities/customer-favorite-restaurant.entity';
import { CustomerFavoriteItemEntity } from '../../entities/customer-favorite-item.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class CustomerProfileService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,
    @InjectRepository(CustomerAddressEntity)
    private readonly addressRepo: Repository<CustomerAddressEntity>,
    @InjectRepository(CustomerFavoriteRestaurantEntity)
    private readonly favRestaurantRepo: Repository<CustomerFavoriteRestaurantEntity>,
    @InjectRepository(CustomerFavoriteItemEntity)
    private readonly favItemRepo: Repository<CustomerFavoriteItemEntity>,
  ) {}

  async getProfile(customerId: string): Promise<CustomerEntity> {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId, deletedAt: IsNull() },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    delete customer.passwordHash;
    return customer;
  }

  async updateProfile(customerId: string, dto: UpdateProfileDto): Promise<CustomerEntity> {
    const customer = await this.getProfile(customerId);

    if (dto.email && dto.email !== customer.email) {
      const emailTaken = await this.customerRepo.findOne({
        where: { email: dto.email, deletedAt: IsNull() },
      });
      if (emailTaken) throw new ConflictException('Email is already in use');
      customer.isEmailVerified = false;
    }

    Object.assign(customer, dto);
    await this.customerRepo.save(customer);
    delete customer.passwordHash;
    return customer;
  }

  async updateProfileImage(customerId: string, imageKey: string): Promise<{ profileImage: string }> {
    await this.customerRepo.update(customerId, { profileImage: imageKey });
    return { profileImage: imageKey };
  }

  // ─── Addresses ────────────────────────────────────────────────────

  async getAddresses(customerId: string): Promise<CustomerAddressEntity[]> {
    return this.addressRepo.find({
      where: { customerId, deletedAt: IsNull() },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async addAddress(customerId: string, dto: CreateAddressDto): Promise<CustomerAddressEntity> {
    const count = await this.addressRepo.count({
      where: { customerId, deletedAt: IsNull() },
    });
    if (count >= 10) throw new BadRequestException('Maximum 10 addresses allowed');

    if (dto.isDefault) {
      await this.addressRepo.update(
        { customerId, deletedAt: IsNull() },
        { isDefault: false },
      );
    }

    const address = this.addressRepo.create({ ...dto, customerId });
    return this.addressRepo.save(address);
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<CustomerAddressEntity> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, customerId, deletedAt: IsNull() },
    });
    if (!address) throw new NotFoundException('Address not found');

    if (dto.isDefault) {
      await this.addressRepo.update(
        { customerId, deletedAt: IsNull() },
        { isDefault: false },
      );
    }

    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  async deleteAddress(customerId: string, addressId: string): Promise<{ message: string }> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, customerId, deletedAt: IsNull() },
    });
    if (!address) throw new NotFoundException('Address not found');

    address.deletedAt = new Date();
    address.isDefault = false;
    await this.addressRepo.save(address);
    return { message: 'Address removed' };
  }

  async setDefaultAddress(customerId: string, addressId: string): Promise<CustomerAddressEntity> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, customerId, deletedAt: IsNull() },
    });
    if (!address) throw new NotFoundException('Address not found');

    await this.addressRepo.update({ customerId, deletedAt: IsNull() }, { isDefault: false });
    address.isDefault = true;
    return this.addressRepo.save(address);
  }

  // ─── Favorites — Restaurants ─────────────────────────────────────

  async getFavoriteRestaurants(customerId: string): Promise<CustomerFavoriteRestaurantEntity[]> {
    return this.favRestaurantRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async addFavoriteRestaurant(customerId: string, restaurantId: string): Promise<{ message: string }> {
    const exists = await this.favRestaurantRepo.findOne({
      where: { customerId, restaurantId },
    });
    if (exists) return { message: 'Already in favorites' };

    await this.favRestaurantRepo.save(
      this.favRestaurantRepo.create({ customerId, restaurantId }),
    );
    return { message: 'Added to favorites' };
  }

  async removeFavoriteRestaurant(customerId: string, restaurantId: string): Promise<{ message: string }> {
    await this.favRestaurantRepo.delete({ customerId, restaurantId });
    return { message: 'Removed from favorites' };
  }

  // ─── Favorites — Items ────────────────────────────────────────────

  async getFavoriteItems(customerId: string): Promise<CustomerFavoriteItemEntity[]> {
    return this.favItemRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async addFavoriteItem(
    customerId: string,
    menuItemId: string,
    restaurantId: string,
  ): Promise<{ message: string }> {
    const exists = await this.favItemRepo.findOne({ where: { customerId, menuItemId } });
    if (exists) return { message: 'Already in favorites' };

    await this.favItemRepo.save(
      this.favItemRepo.create({ customerId, menuItemId, restaurantId }),
    );
    return { message: 'Added to favorites' };
  }

  async removeFavoriteItem(customerId: string, menuItemId: string): Promise<{ message: string }> {
    await this.favItemRepo.delete({ customerId, menuItemId });
    return { message: 'Removed from favorites' };
  }
}
