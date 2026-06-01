import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  DeliveryPartnerEntity,
  DeliveryPartnerStatus,
} from '../../entities/delivery-partner.entity';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto';
import { UpdateDeliveryPartnerDto } from './dto/update-delivery-partner.dto';
import { UpdatePartnerStatusDto } from './dto/update-partner-status.dto';
import { RatePartnerDto } from './dto/rate-partner.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DeliveryPartnersService {
  constructor(
    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepository: Repository<DeliveryPartnerEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(payload: CreateDeliveryPartnerDto) {
    const existing = await this.partnerRepository.findOne({
      where: [{ email: payload.email }, { phone: payload.phone }],
    });

    if (existing) {
      throw new BadRequestException(
        'A delivery partner with the same email or phone already exists.',
      );
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const partner = this.partnerRepository.create({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      vehicleType: payload.vehicleType,
      vehicleNumber: payload.vehicleNumber,
      vehicleModel: payload.vehicleModel,
      licenseNumber: payload.licenseNumber,
      aadharNumber: payload.aadharNumber,
      panNumber: payload.panNumber,
      bankAccountNumber: payload.bankAccountNumber,
      bankIfscCode: payload.bankIfscCode,
      bankName: payload.bankName,
      city: payload.city,
      state: payload.state,
      profilePhoto: payload.profilePhoto,
      passwordHash,
      status: DeliveryPartnerStatus.PENDING,
      isOnline: false,
      isAvailable: false,
      rating: 0,
      totalRatings: 0,
      totalDeliveries: 0,
      totalEarnings: 0,
    });

    const saved = await this.partnerRepository.save(partner);

    await this.notificationsService.sendDeliveryPartnerCredentials({
      name: saved.name,
      email: saved.email,
      password: temporaryPassword,
    });

    return saved;
  }

  private generateTemporaryPassword(): string {
    return Math.random().toString(36).slice(-8) + 'D1!';
  }

  async findAll(page = 1, limit = 20, status?: DeliveryPartnerStatus) {
    const query = this.partnerRepository
      .createQueryBuilder('p')
      .where('p.deletedAt IS NULL')
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      query.andWhere('p.status = :status', { status });
    }

    const [data, total] = await query.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const partner = await this.partnerRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!partner) {
      throw new NotFoundException('Delivery partner not found.');
    }

    return partner;
  }

  async update(id: string, payload: UpdateDeliveryPartnerDto) {
    const partner = await this.findOne(id);
    Object.assign(partner, payload);
    return this.partnerRepository.save(partner);
  }

  async updateStatus(id: string, payload: UpdatePartnerStatusDto) {
    const partner = await this.findOne(id);
    partner.status = payload.status;

    if (payload.status === DeliveryPartnerStatus.BLOCKED || payload.status === DeliveryPartnerStatus.INACTIVE) {
      partner.isOnline = false;
      partner.isAvailable = false;
    }

    return this.partnerRepository.save(partner);
  }

  async toggleOnlineStatus(id: string, isOnline: boolean) {
    const partner = await this.findOne(id);

    if (partner.status !== DeliveryPartnerStatus.VERIFIED && partner.status !== DeliveryPartnerStatus.ACTIVE) {
      throw new BadRequestException('Partner must be verified before going online.');
    }

    partner.isOnline = isOnline;
    partner.isAvailable = isOnline;

    if (isOnline) {
      partner.status = DeliveryPartnerStatus.ACTIVE;
    }

    return this.partnerRepository.save(partner);
  }

  async ratePartner(id: string, payload: RatePartnerDto) {
    const partner = await this.findOne(id);

    const totalRatingPoints = partner.rating * partner.totalRatings + payload.rating;
    partner.totalRatings += 1;
    partner.rating = totalRatingPoints / partner.totalRatings;

    return this.partnerRepository.save(partner);
  }

  async getEarnings(id: string) {
    const partner = await this.findOne(id);

    return {
      partnerId: partner.id,
      totalEarnings: partner.totalEarnings,
      totalDeliveries: partner.totalDeliveries,
      rating: partner.rating,
      totalRatings: partner.totalRatings,
    };
  }

  async softDelete(id: string) {
    const partner = await this.findOne(id);
    partner.deletedAt = new Date();
    partner.isOnline = false;
    partner.isAvailable = false;
    await this.partnerRepository.save(partner);
    return { message: 'Delivery partner removed successfully.' };
  }

  async findNearbyAvailable(latitude: number, longitude: number, radiusKm = 10) {
    const partners = await this.partnerRepository
      .createQueryBuilder('p')
      .where('p.status = :status', { status: DeliveryPartnerStatus.ACTIVE })
      .andWhere('p.isOnline = true')
      .andWhere('p.isAvailable = true')
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.currentLatitude IS NOT NULL')
      .andWhere('p.currentLongitude IS NOT NULL')
      .getMany();

    return partners
      .map((p) => ({
        ...p,
        distanceKm: this.haversineDistance(
          latitude,
          longitude,
          Number(p.currentLatitude),
          Number(p.currentLongitude),
        ),
      }))
      .filter((p) => p.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number) {
    return (deg * Math.PI) / 180;
  }
}
