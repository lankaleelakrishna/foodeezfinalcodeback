import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import {
  AssignmentType,
  DeliveryAssignmentEntity,
  DeliveryStatus,
} from '../../entities/delivery-assignment.entity';
import {
  DeliveryPartnerEntity,
  DeliveryPartnerStatus,
} from '../../entities/delivery-partner.entity';
import { DeliveryPartnersService } from '../delivery-partners/delivery-partners.service';
import { AutoAssignDto } from './dto/auto-assign.dto';
import { ManualAssignDto } from './dto/manual-assign.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { ReassignDto } from './dto/reassign.dto';

const ACTIVE_STATUSES = [
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.ACCEPTED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.ON_THE_WAY,
  DeliveryStatus.ARRIVED,
];

@Injectable()
export class DeliveryAssignmentsService {
  constructor(
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignmentRepository: Repository<DeliveryAssignmentEntity>,

    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepository: Repository<DeliveryPartnerEntity>,

    private readonly partnersService: DeliveryPartnersService,
  ) {}

  async autoAssign(payload: AutoAssignDto) {
    await this.assertNoActiveAssignment(payload.orderId);

    const nearby = await this.partnersService.findNearbyAvailable(
      payload.restaurantLatitude,
      payload.restaurantLongitude,
    );

    if (!nearby.length) {
      throw new BadRequestException('No available delivery partners nearby. Please try manual assignment.');
    }

    const partnersWithNoActiveJob = await this.filterPartnersWithNoActiveJob(nearby);

    if (!partnersWithNoActiveJob.length) {
      throw new BadRequestException('All nearby partners are currently on delivery. Please try again shortly.');
    }

    const best = partnersWithNoActiveJob[0];
    const distanceKm = best.distanceKm;
    const estimatedDuration = this.calculateEta(distanceKm);

    const assignment = this.assignmentRepository.create({
      orderId: payload.orderId,
      partnerId: best.id,
      restaurantId: payload.restaurantId,
      branchId: payload.branchId,
      restaurantLatitude: payload.restaurantLatitude,
      restaurantLongitude: payload.restaurantLongitude,
      customerLatitude: payload.customerLatitude,
      customerLongitude: payload.customerLongitude,
      customerAddress: payload.customerAddress,
      assignmentType: AssignmentType.AUTO,
      status: DeliveryStatus.ASSIGNED,
      estimatedDistanceKm: distanceKm,
      estimatedDurationMins: estimatedDuration,
      deliveryFee: payload.deliveryFee ?? 0,
    });

    await this.partnerRepository.update(best.id, { isAvailable: false });

    return this.assignmentRepository.save(assignment);
  }

  async manualAssign(payload: ManualAssignDto) {
    await this.assertNoActiveAssignment(payload.orderId);

    const partner = await this.partnerRepository.findOne({
      where: { id: payload.partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Delivery partner not found.');
    }

    if (partner.status !== DeliveryPartnerStatus.ACTIVE && partner.status !== DeliveryPartnerStatus.VERIFIED) {
      throw new BadRequestException('Partner is not active.');
    }

    if (!partner.isOnline) {
      throw new BadRequestException('Partner is currently offline.');
    }

    const hasActiveJob = await this.assignmentRepository.findOne({
      where: { partnerId: partner.id, status: In(ACTIVE_STATUSES) },
    });

    if (hasActiveJob) {
      throw new BadRequestException('This partner already has an active delivery.');
    }

    let distanceKm: number | undefined;
    let estimatedDuration: number | undefined;

    if (payload.restaurantLatitude && payload.restaurantLongitude) {
      distanceKm = this.partnersService.haversineDistance(
        payload.restaurantLatitude,
        payload.restaurantLongitude,
        partner.currentLatitude ? Number(partner.currentLatitude) : payload.restaurantLatitude,
        partner.currentLongitude ? Number(partner.currentLongitude) : payload.restaurantLongitude,
      );
      estimatedDuration = this.calculateEta(distanceKm);
    }

    const assignment = this.assignmentRepository.create({
      orderId: payload.orderId,
      partnerId: partner.id,
      restaurantId: payload.restaurantId,
      branchId: payload.branchId,
      restaurantLatitude: payload.restaurantLatitude,
      restaurantLongitude: payload.restaurantLongitude,
      customerLatitude: payload.customerLatitude,
      customerLongitude: payload.customerLongitude,
      customerAddress: payload.customerAddress,
      assignmentType: AssignmentType.MANUAL,
      status: DeliveryStatus.ASSIGNED,
      estimatedDistanceKm: distanceKm,
      estimatedDurationMins: estimatedDuration,
      deliveryFee: payload.deliveryFee ?? 0,
    });

    await this.partnerRepository.update(partner.id, { isAvailable: false });

    return this.assignmentRepository.save(assignment);
  }

  async updateStatus(id: string, payload: UpdateAssignmentStatusDto) {
    const assignment = await this.findOne(id);

    this.validateStatusTransition(assignment.status, payload.status);

    const now = new Date();
    const update: Partial<DeliveryAssignmentEntity> = { status: payload.status };

    switch (payload.status) {
      case DeliveryStatus.ACCEPTED:
        update.acceptedAt = now;
        break;
      case DeliveryStatus.PICKED_UP:
        update.pickedUpAt = now;
        break;
      case DeliveryStatus.ON_THE_WAY:
        update.onTheWayAt = now;
        break;
      case DeliveryStatus.ARRIVED:
        update.arrivedAt = now;
        break;
      case DeliveryStatus.DELIVERED:
        update.deliveredAt = now;
        update.actualDurationMins = assignment.assignedAt
          ? Math.round((now.getTime() - assignment.assignedAt.getTime()) / 60000)
          : undefined;
        await this.onDeliveryCompleted(assignment);
        break;
      case DeliveryStatus.CANCELLED:
        update.cancelledAt = now;
        update.cancellationReason = payload.cancellationReason;
        await this.partnerRepository.update(assignment.partnerId, { isAvailable: true });
        break;
    }

    Object.assign(assignment, update);
    return this.assignmentRepository.save(assignment);
  }

  async reassign(id: string, payload: ReassignDto) {
    const assignment = await this.findOne(id);

    if (!ACTIVE_STATUSES.includes(assignment.status)) {
      throw new BadRequestException('Cannot reassign a completed or cancelled delivery.');
    }

    const newPartner = await this.partnerRepository.findOne({
      where: { id: payload.partnerId },
    });

    if (!newPartner) {
      throw new NotFoundException('New delivery partner not found.');
    }

    if (!newPartner.isOnline || !newPartner.isAvailable) {
      throw new BadRequestException('The selected partner is not available.');
    }

    const hasActiveJob = await this.assignmentRepository.findOne({
      where: { partnerId: newPartner.id, status: In(ACTIVE_STATUSES) },
    });

    if (hasActiveJob) {
      throw new BadRequestException('This partner already has an active delivery.');
    }

    await this.partnerRepository.update(assignment.partnerId, { isAvailable: true });

    assignment.status = DeliveryStatus.CANCELLED;
    assignment.cancelledAt = new Date();
    assignment.cancellationReason = payload.reason ?? 'Reassigned';
    await this.assignmentRepository.save(assignment);

    return this.manualAssign({
      orderId: assignment.orderId,
      partnerId: payload.partnerId,
      restaurantId: assignment.restaurantId,
      branchId: assignment.branchId,
      restaurantLatitude: assignment.restaurantLatitude ? Number(assignment.restaurantLatitude) : undefined,
      restaurantLongitude: assignment.restaurantLongitude ? Number(assignment.restaurantLongitude) : undefined,
      customerLatitude: assignment.customerLatitude ? Number(assignment.customerLatitude) : undefined,
      customerLongitude: assignment.customerLongitude ? Number(assignment.customerLongitude) : undefined,
      customerAddress: assignment.customerAddress,
      deliveryFee: Number(assignment.deliveryFee),
    });
  }

  async findPending() {
    return this.assignmentRepository.find({
      where: { status: DeliveryStatus.ASSIGNED },
      relations: ['partner'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['partner'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    return assignment;
  }

  async findByOrder(orderId: string) {
    return this.assignmentRepository.find({
      where: { orderId },
      relations: ['partner'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByPartner(partnerId: string, page = 1, limit = 20) {
    const [data, total] = await this.assignmentRepository.findAndCount({
      where: { partnerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  private async assertNoActiveAssignment(orderId: string) {
    const existing = await this.assignmentRepository.findOne({
      where: { orderId, status: Not(DeliveryStatus.CANCELLED) },
    });

    if (existing) {
      throw new BadRequestException('This order already has an active assignment.');
    }
  }

  private async filterPartnersWithNoActiveJob(partners: any[]) {
    const ids = partners.map((p) => p.id);

    const busy = await this.assignmentRepository
      .createQueryBuilder('a')
      .select('a.partner_id')
      .where('a.partner_id IN (:...ids)', { ids })
      .andWhere('a.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
      .getRawMany();

    const busyIds = new Set(busy.map((b) => b.a_partner_id));

    return partners.filter((p) => !busyIds.has(p.id));
  }

  private async onDeliveryCompleted(assignment: DeliveryAssignmentEntity) {
    await this.partnerRepository
      .createQueryBuilder()
      .update()
      .set({
        isAvailable: true,
        totalDeliveries: () => 'total_deliveries + 1',
        totalEarnings: () => `total_earnings + ${Number(assignment.deliveryFee)}`,
      })
      .where('id = :id', { id: assignment.partnerId })
      .execute();
  }

  private validateStatusTransition(current: DeliveryStatus, next: DeliveryStatus) {
    const allowed: Record<DeliveryStatus, DeliveryStatus[]> = {
      [DeliveryStatus.ASSIGNED]: [DeliveryStatus.ACCEPTED, DeliveryStatus.CANCELLED],
      [DeliveryStatus.ACCEPTED]: [DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED],
      [DeliveryStatus.PICKED_UP]: [DeliveryStatus.ON_THE_WAY, DeliveryStatus.CANCELLED],
      [DeliveryStatus.ON_THE_WAY]: [DeliveryStatus.ARRIVED, DeliveryStatus.CANCELLED],
      [DeliveryStatus.ARRIVED]: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED],
      [DeliveryStatus.DELIVERED]: [],
      [DeliveryStatus.CANCELLED]: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Cannot transition from ${current} to ${next}.`,
      );
    }
  }

  calculateEta(distanceKm: number, prepTimeMins = 10): number {
    const avgSpeedKmh = 30;
    const travelMins = (distanceKm / avgSpeedKmh) * 60;
    const trafficBuffer = travelMins * 0.2;
    return Math.ceil(prepTimeMins + travelMins + trafficBuffer);
  }
}
