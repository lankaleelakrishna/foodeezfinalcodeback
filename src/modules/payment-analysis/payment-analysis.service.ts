import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity, PaymentStatus, PaymentType } from '../../entities/payment.entity';
import { RestaurantEntity } from '../../entities/restaurant.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTER_LABELS = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'];

@Injectable()
export class PaymentAnalysisService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(RestaurantEntity)
    private readonly restaurantRepo: Repository<RestaurantEntity>,
  ) {}

  async createPayment(dto: CreatePaymentDto): Promise<PaymentEntity> {
    const restaurant = await this.restaurantRepo.findOne({ where: { id: dto.restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const payment = this.paymentRepo.create({
      restaurant,
      restaurantId: dto.restaurantId,
      amount: dto.amount,
      currency: dto.currency ?? 'INR',
      type: dto.type,
      status: dto.status ?? PaymentStatus.Pending,
      transactionId: dto.transactionId,
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
    });

    return this.paymentRepo.save(payment);
  }

  async listPayments(page = 1, limit = 20) {
    const [items, total] = await this.paymentRepo.findAndCount({
      relations: ['restaurant'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { items, total, page, limit };
  }

  async getDaily(year: number, month: number) {
    const rows: any[] = await this.paymentRepo.query(
      `
      SELECT
        DATE_TRUNC('day', created_at) AS period,
        TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS label,
        COALESCE(SUM(CASE WHEN status = $1 THEN amount::numeric ELSE 0 END), 0)::float AS revenue,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = $1 THEN 1 END)::int AS paid_count,
        COUNT(CASE WHEN status = $2 THEN 1 END)::int AS failed_count,
        COUNT(CASE WHEN status = $3 THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN status = $4 THEN 1 END)::int AS refunded_count
      FROM "Payment"
      WHERE EXTRACT(YEAR FROM created_at) = $5
        AND EXTRACT(MONTH FROM created_at) = $6
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY period ASC
      `,
      [PaymentStatus.Paid, PaymentStatus.Failed, PaymentStatus.Pending, PaymentStatus.Refunded, year, month],
    );

    return {
      period: 'daily',
      year,
      month,
      monthName: MONTH_NAMES[month - 1],
      data: rows.map((r) => ({
        label: r.label,
        revenue: r.revenue,
        total: r.total,
        paidCount: r.paid_count,
        failedCount: r.failed_count,
        pendingCount: r.pending_count,
        refundedCount: r.refunded_count,
      })),
      totals: this.calcTotals(rows),
    };
  }

  async getWeekly(year: number, quarter?: number) {
    const quarterFilter = quarter
      ? `AND CEIL(EXTRACT(MONTH FROM created_at) / 3.0)::int = ${Number(quarter)}`
      : '';

    const rows: any[] = await this.paymentRepo.query(
      `
      SELECT
        DATE_TRUNC('week', created_at) AS period,
        CONCAT('Week ', TO_CHAR(DATE_TRUNC('week', created_at), 'WW'),
               ' (', TO_CHAR(DATE_TRUNC('week', created_at), 'Mon DD'), ')') AS label,
        COALESCE(SUM(CASE WHEN status = $1 THEN amount::numeric ELSE 0 END), 0)::float AS revenue,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = $1 THEN 1 END)::int AS paid_count,
        COUNT(CASE WHEN status = $2 THEN 1 END)::int AS failed_count,
        COUNT(CASE WHEN status = $3 THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN status = $4 THEN 1 END)::int AS refunded_count
      FROM "Payment"
      WHERE EXTRACT(YEAR FROM created_at) = $5
        ${quarterFilter}
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY period ASC
      `,
      [PaymentStatus.Paid, PaymentStatus.Failed, PaymentStatus.Pending, PaymentStatus.Refunded, year],
    );

    return {
      period: 'weekly',
      year,
      ...(quarter ? { quarter, quarterLabel: QUARTER_LABELS[quarter - 1] } : {}),
      data: rows.map((r) => ({
        label: r.label,
        revenue: r.revenue,
        total: r.total,
        paidCount: r.paid_count,
        failedCount: r.failed_count,
        pendingCount: r.pending_count,
        refundedCount: r.refunded_count,
      })),
      totals: this.calcTotals(rows),
    };
  }

  async getMonthly(year: number) {
    const rows: any[] = await this.paymentRepo.query(
      `
      SELECT
        EXTRACT(MONTH FROM created_at)::int AS month_num,
        COALESCE(SUM(CASE WHEN status = $1 THEN amount::numeric ELSE 0 END), 0)::float AS revenue,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = $1 THEN 1 END)::int AS paid_count,
        COUNT(CASE WHEN status = $2 THEN 1 END)::int AS failed_count,
        COUNT(CASE WHEN status = $3 THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN status = $4 THEN 1 END)::int AS refunded_count
      FROM "Payment"
      WHERE EXTRACT(YEAR FROM created_at) = $5
      GROUP BY EXTRACT(MONTH FROM created_at)
      ORDER BY month_num ASC
      `,
      [PaymentStatus.Paid, PaymentStatus.Failed, PaymentStatus.Pending, PaymentStatus.Refunded, year],
    );

    const monthMap: Record<number, any> = {};
    rows.forEach((r) => (monthMap[r.month_num] = r));

    const data = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const r = monthMap[m];
      return {
        label: MONTH_NAMES[i],
        month: m,
        revenue: r ? r.revenue : 0,
        total: r ? r.total : 0,
        paidCount: r ? r.paid_count : 0,
        failedCount: r ? r.failed_count : 0,
        pendingCount: r ? r.pending_count : 0,
        refundedCount: r ? r.refunded_count : 0,
      };
    });

    return {
      period: 'monthly',
      year,
      data,
      totals: this.calcTotals(rows),
    };
  }

  async getQuarterly(year: number) {
    const rows: any[] = await this.paymentRepo.query(
      `
      SELECT
        CEIL(EXTRACT(MONTH FROM created_at) / 3.0)::int AS quarter_num,
        COALESCE(SUM(CASE WHEN status = $1 THEN amount::numeric ELSE 0 END), 0)::float AS revenue,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = $1 THEN 1 END)::int AS paid_count,
        COUNT(CASE WHEN status = $2 THEN 1 END)::int AS failed_count,
        COUNT(CASE WHEN status = $3 THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN status = $4 THEN 1 END)::int AS refunded_count
      FROM "Payment"
      WHERE EXTRACT(YEAR FROM created_at) = $5
      GROUP BY CEIL(EXTRACT(MONTH FROM created_at) / 3.0)
      ORDER BY quarter_num ASC
      `,
      [PaymentStatus.Paid, PaymentStatus.Failed, PaymentStatus.Pending, PaymentStatus.Refunded, year],
    );

    const qMap: Record<number, any> = {};
    rows.forEach((r) => (qMap[r.quarter_num] = r));

    const data = [1, 2, 3, 4].map((q) => {
      const r = qMap[q];
      return {
        label: QUARTER_LABELS[q - 1],
        quarter: q,
        revenue: r ? r.revenue : 0,
        total: r ? r.total : 0,
        paidCount: r ? r.paid_count : 0,
        failedCount: r ? r.failed_count : 0,
        pendingCount: r ? r.pending_count : 0,
        refundedCount: r ? r.refunded_count : 0,
      };
    });

    return {
      period: 'quarterly',
      year,
      data,
      totals: this.calcTotals(rows),
    };
  }

  async getSummary() {
    const [overall]: any[] = await this.paymentRepo.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN status = $1 THEN amount::numeric ELSE 0 END), 0)::float AS total_revenue,
        COUNT(*)::int AS total_transactions,
        COUNT(CASE WHEN status = $1 THEN 1 END)::int AS paid_count,
        COUNT(CASE WHEN status = $2 THEN 1 END)::int AS failed_count,
        COUNT(CASE WHEN status = $3 THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN status = $4 THEN 1 END)::int AS refunded_count
      FROM "Payment"
      `,
      [PaymentStatus.Paid, PaymentStatus.Failed, PaymentStatus.Pending, PaymentStatus.Refunded],
    );

    const byType: any[] = await this.paymentRepo.query(
      `
      SELECT
        type,
        COALESCE(SUM(CASE WHEN status = $1 THEN amount::numeric ELSE 0 END), 0)::float AS revenue,
        COUNT(*)::int AS total
      FROM "Payment"
      GROUP BY type
      ORDER BY revenue DESC
      `,
      [PaymentStatus.Paid],
    );

    const byStatus: any[] = await this.paymentRepo.query(`
      SELECT status, COUNT(*)::int AS count,
        COALESCE(SUM(amount::numeric), 0)::float AS amount
      FROM "Payment"
      GROUP BY status
    `);

    const byMethod: any[] = await this.paymentRepo.query(`
      SELECT payment_method AS method, COUNT(*)::int AS count
      FROM "Payment"
      WHERE payment_method IS NOT NULL
      GROUP BY payment_method
      ORDER BY count DESC
    `);

    const recentPayments = await this.paymentRepo.find({
      relations: ['restaurant'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalRevenue: overall.total_revenue,
      totalTransactions: overall.total_transactions,
      paidCount: overall.paid_count,
      failedCount: overall.failed_count,
      pendingCount: overall.pending_count,
      refundedCount: overall.refunded_count,
      byType: byType.map((r) => ({ type: r.type, revenue: r.revenue, total: r.total })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: r.count, amount: r.amount })),
      byMethod: byMethod.map((r) => ({ method: r.method, count: r.count })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        restaurantName: (p.restaurant as any)?.name,
        amount: p.amount,
        currency: p.currency,
        type: p.type,
        status: p.status,
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    };
  }

  private calcTotals(rows: any[]) {
    return {
      totalRevenue: rows.reduce((s, r) => s + (r.revenue ?? 0), 0),
      totalTransactions: rows.reduce((s, r) => s + (r.total ?? 0), 0),
      totalPaid: rows.reduce((s, r) => s + (r.paid_count ?? 0), 0),
      totalFailed: rows.reduce((s, r) => s + (r.failed_count ?? 0), 0),
      totalPending: rows.reduce((s, r) => s + (r.pending_count ?? 0), 0),
      totalRefunded: rows.reduce((s, r) => s + (r.refunded_count ?? 0), 0),
    };
  }
}
