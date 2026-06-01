import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryAssignmentEntity, DeliveryStatus } from '../../entities/delivery-assignment.entity';
import { DeliveryPartnerEntity, DeliveryPartnerStatus } from '../../entities/delivery-partner.entity';
import { DeliveryPayoutEntity } from '../../entities/delivery-payout.entity';

@Injectable()
export class DeliveryAnalyticsService {
  constructor(
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignmentRepository: Repository<DeliveryAssignmentEntity>,

    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepository: Repository<DeliveryPartnerEntity>,

    @InjectRepository(DeliveryPayoutEntity)
    private readonly payoutRepository: Repository<DeliveryPayoutEntity>,
  ) {}

  async getOverview(from?: string, to?: string) {
    const query = this.assignmentRepository.createQueryBuilder('a');

    if (from) query.andWhere('a.created_at >= :from', { from });
    if (to) query.andWhere('a.created_at <= :to', { to });

    const [total, delivered, cancelled] = await Promise.all([
      query.clone().getCount(),
      query.clone().andWhere('a.status = :s', { s: DeliveryStatus.DELIVERED }).getCount(),
      query.clone().andWhere('a.status = :s', { s: DeliveryStatus.CANCELLED }).getCount(),
    ]);

    const avgDurationResult = await query
      .clone()
      .andWhere('a.status = :s', { s: DeliveryStatus.DELIVERED })
      .andWhere('a.actual_duration_mins IS NOT NULL')
      .select('AVG(a.actual_duration_mins)', 'avg')
      .getRawOne();

    const activePartnersResult = await this.partnerRepository.count({
      where: { status: DeliveryPartnerStatus.ACTIVE, isOnline: true },
    });

    const delayed = await this.assignmentRepository
      .createQueryBuilder('a')
      .where('a.status = :s', { s: DeliveryStatus.DELIVERED })
      .andWhere('a.actual_duration_mins > a.estimated_duration_mins * 1.3')
      .getCount();

    return {
      totalAssignments: total,
      delivered,
      cancelled,
      successRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : '0',
      avgDeliveryMins: avgDurationResult?.avg ? Number(avgDurationResult.avg).toFixed(1) : null,
      activeRiders: activePartnersResult,
      delayedDeliveries: delayed,
    };
  }

  async getRiderPerformance(page = 1, limit = 20) {
    const partners = await this.partnerRepository
      .createQueryBuilder('p')
      .where('p.deleted_at IS NULL')
      .orderBy('p.total_deliveries', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const ids = partners.map((p) => p.id);

    if (!ids.length) return { data: [], total: 0, page, limit };

    const stats = await this.assignmentRepository
      .createQueryBuilder('a')
      .select('a.partner_id', 'partnerId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN a.status = :delivered THEN 1 ELSE 0 END)', 'delivered')
      .addSelect('SUM(CASE WHEN a.status = :cancelled THEN 1 ELSE 0 END)', 'cancelled')
      .addSelect('AVG(a.actual_duration_mins)', 'avgDuration')
      .where('a.partner_id IN (:...ids)', { ids })
      .setParameter('delivered', DeliveryStatus.DELIVERED)
      .setParameter('cancelled', DeliveryStatus.CANCELLED)
      .groupBy('a.partner_id')
      .getRawMany();

    const statsMap = new Map(stats.map((s) => [s.partnerId, s]));

    const total = await this.partnerRepository.count({ where: {} });

    const data = partners.map((p) => {
      const s = statsMap.get(p.id);
      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        vehicleType: p.vehicleType,
        rating: p.rating,
        totalDeliveries: p.totalDeliveries,
        totalEarnings: p.totalEarnings,
        isOnline: p.isOnline,
        status: p.status,
        recentStats: s
          ? {
              total: Number(s.total),
              delivered: Number(s.delivered),
              cancelled: Number(s.cancelled),
              avgDurationMins: s.avgDuration ? Number(s.avgDuration).toFixed(1) : null,
            }
          : null,
      };
    });

    return { data, total, page, limit };
  }

  async getOrderAnalytics(from?: string, to?: string) {
    const query = this.assignmentRepository.createQueryBuilder('a');

    if (from) query.andWhere('a.created_at >= :from', { from });
    if (to) query.andWhere('a.created_at <= :to', { to });

    const byStatus = await query
      .clone()
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.status')
      .getRawMany();

    const hourlyVolume = await query
      .clone()
      .select('EXTRACT(HOUR FROM a.created_at)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .groupBy('EXTRACT(HOUR FROM a.created_at)')
      .orderBy('EXTRACT(HOUR FROM a.created_at)', 'ASC')
      .getRawMany();

    const topRestaurants = await this.assignmentRepository
      .createQueryBuilder('a')
      .select('a.restaurant_id', 'restaurantId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.restaurant_id')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return { byStatus, hourlyVolume, topRestaurants };
  }

  async getEarningsAnalytics(from?: string, to?: string) {
    const query = this.payoutRepository.createQueryBuilder('p');

    if (from) query.andWhere('p.created_at >= :from', { from });
    if (to) query.andWhere('p.created_at <= :to', { to });

    const [totalPayout, byType] = await Promise.all([
      query.clone().select('SUM(p.amount)', 'total').getRawOne(),
      query
        .clone()
        .select('p.payout_type', 'type')
        .addSelect('SUM(p.amount)', 'total')
        .groupBy('p.payout_type')
        .getRawMany(),
    ]);

    return {
      totalPayout: totalPayout?.total ? Number(totalPayout.total).toFixed(2) : '0',
      byType,
    };
  }
}
