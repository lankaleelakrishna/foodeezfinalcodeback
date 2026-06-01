import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeliveryPayoutEntity,
  PayoutStatus,
  PayoutType,
} from '../../entities/delivery-payout.entity';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';
import { ProcessPayoutDto } from './dto/process-payout.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class DeliveryPayoutsService {
  constructor(
    @InjectRepository(DeliveryPayoutEntity)
    private readonly payoutRepository: Repository<DeliveryPayoutEntity>,

    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepository: Repository<DeliveryPartnerEntity>,
  ) {}

  async create(payload: ProcessPayoutDto) {
    const partner = await this.partnerRepository.findOne({
      where: { id: payload.partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Delivery partner not found.');
    }

    const payout = this.payoutRepository.create({
      partnerId: payload.partnerId,
      amount: payload.amount,
      payoutType: payload.payoutType,
      assignmentId: payload.assignmentId,
      description: payload.description,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      status: PayoutStatus.PENDING,
    });

    return this.payoutRepository.save(payout);
  }

  async findAll(page = 1, limit = 20, status?: PayoutStatus) {
    const query = this.payoutRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.partner', 'partner')
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      query.where('p.status = :status', { status });
    }

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit };
  }

  async findByPartner(partnerId: string, page = 1, limit = 20) {
    const [data, total] = await this.payoutRepository.findAndCount({
      where: { partnerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const summary = await this.payoutRepository
      .createQueryBuilder('p')
      .where('p.partner_id = :partnerId', { partnerId })
      .select('SUM(CASE WHEN p.status = :paid THEN p.amount ELSE 0 END)', 'totalPaid')
      .addSelect('SUM(CASE WHEN p.status = :pending THEN p.amount ELSE 0 END)', 'totalPending')
      .setParameter('paid', PayoutStatus.PAID)
      .setParameter('pending', PayoutStatus.PENDING)
      .getRawOne();

    return {
      data,
      total,
      page,
      limit,
      summary: {
        totalPaid: Number(summary?.totalPaid ?? 0).toFixed(2),
        totalPending: Number(summary?.totalPending ?? 0).toFixed(2),
      },
    };
  }

  async processPayout(id: string) {
    const payout = await this.payoutRepository.findOne({ where: { id } });

    if (!payout) {
      throw new NotFoundException('Payout record not found.');
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(`Cannot process a payout with status: ${payout.status}`);
    }

    payout.status = PayoutStatus.PROCESSING;
    await this.payoutRepository.save(payout);

    payout.status = PayoutStatus.PAID;
    payout.processedAt = new Date();
    payout.transactionId = `TXN-${randomUUID().substring(0, 8).toUpperCase()}`;

    await this.partnerRepository
      .createQueryBuilder()
      .update()
      .set({ totalEarnings: () => `total_earnings + ${Number(payout.amount)}` })
      .where('id = :id', { id: payout.partnerId })
      .execute();

    return this.payoutRepository.save(payout);
  }

  async bulkProcessPending(partnerId?: string) {
    const query = this.payoutRepository
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PayoutStatus.PENDING });

    if (partnerId) {
      query.andWhere('p.partner_id = :partnerId', { partnerId });
    }

    const pending = await query.getMany();
    const results = await Promise.allSettled(pending.map((p) => this.processPayout(p.id)));

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { processed: succeeded, failed, total: pending.length };
  }
}
