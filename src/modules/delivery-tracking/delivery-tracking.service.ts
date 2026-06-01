import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryTrackingEntity } from '../../entities/delivery-tracking.entity';
import { DeliveryLocationHistoryEntity } from '../../entities/delivery-location-history.entity';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';
import { DeliveryAssignmentEntity } from '../../entities/delivery-assignment.entity';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class DeliveryTrackingService {
  constructor(
    @InjectRepository(DeliveryTrackingEntity)
    private readonly trackingRepository: Repository<DeliveryTrackingEntity>,

    @InjectRepository(DeliveryLocationHistoryEntity)
    private readonly historyRepository: Repository<DeliveryLocationHistoryEntity>,

    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepository: Repository<DeliveryPartnerEntity>,

    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignmentRepository: Repository<DeliveryAssignmentEntity>,
  ) {}

  async updateLocation(payload: UpdateLocationDto) {
    const partner = await this.partnerRepository.findOne({
      where: { id: payload.partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Delivery partner not found.');
    }

    await this.partnerRepository.update(payload.partnerId, {
      currentLatitude: payload.latitude,
      currentLongitude: payload.longitude,
    });

    let tracking = await this.trackingRepository.findOne({
      where: { partnerId: payload.partnerId },
    });

    if (tracking) {
      tracking.latitude = payload.latitude;
      tracking.longitude = payload.longitude;
      tracking.speed = payload.speed;
      tracking.heading = payload.heading;
      tracking.accuracy = payload.accuracy;
      tracking.assignmentId = payload.assignmentId;
      tracking.orderId = payload.orderId;
      tracking.updatedAt = new Date();
      await this.trackingRepository.save(tracking);
    } else {
      tracking = this.trackingRepository.create({
        partnerId: payload.partnerId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed: payload.speed,
        heading: payload.heading,
        accuracy: payload.accuracy,
        assignmentId: payload.assignmentId,
        orderId: payload.orderId,
      });
      await this.trackingRepository.save(tracking);
    }

    const history = this.historyRepository.create({
      partnerId: payload.partnerId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed: payload.speed,
      heading: payload.heading,
      assignmentId: payload.assignmentId,
    });
    await this.historyRepository.save(history);

    return {
      partnerId: payload.partnerId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      timestamp: new Date(),
    };
  }

  async getTrackingByOrder(orderId: string) {
    const assignment = await this.assignmentRepository.findOne({
      where: { orderId },
      relations: ['partner'],
      order: { createdAt: 'DESC' },
    });

    if (!assignment) {
      throw new NotFoundException('No assignment found for this order.');
    }

    const tracking = await this.trackingRepository.findOne({
      where: { partnerId: assignment.partnerId },
    });

    return {
      orderId,
      assignmentId: assignment.id,
      status: assignment.status,
      partner: {
        id: assignment.partner?.id,
        name: assignment.partner?.name,
        phone: assignment.partner?.phone,
        vehicleType: assignment.partner?.vehicleType,
        rating: assignment.partner?.rating,
      },
      currentLocation: tracking
        ? { latitude: tracking.latitude, longitude: tracking.longitude, updatedAt: tracking.updatedAt }
        : null,
      estimatedDurationMins: assignment.estimatedDurationMins,
      assignedAt: assignment.assignedAt,
      acceptedAt: assignment.acceptedAt,
      pickedUpAt: assignment.pickedUpAt,
      deliveredAt: assignment.deliveredAt,
    };
  }

  async getTrackingByRider(partnerId: string) {
    const tracking = await this.trackingRepository.findOne({
      where: { partnerId },
      relations: ['partner'],
    });

    if (!tracking) {
      throw new NotFoundException('No live tracking data found for this rider.');
    }

    return tracking;
  }

  async getLocationHistory(partnerId: string, assignmentId?: string) {
    const query = this.historyRepository
      .createQueryBuilder('h')
      .where('h.partner_id = :partnerId', { partnerId })
      .orderBy('h.recorded_at', 'DESC')
      .take(500);

    if (assignmentId) {
      query.andWhere('h.assignment_id = :assignmentId', { assignmentId });
    }

    return query.getMany();
  }

  async getActiveRiders() {
    return this.trackingRepository.find({
      relations: ['partner'],
      order: { updatedAt: 'DESC' },
    });
  }
}
