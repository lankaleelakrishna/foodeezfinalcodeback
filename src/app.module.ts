import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppCacheModule } from './cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { BranchesModule } from './modules/branches/branches.module';
import { MenusModule } from './modules/menus/menus.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PaymentAnalysisModule } from './modules/payment-analysis/payment-analysis.module';
import { DeliveryPartnersModule } from './modules/delivery-partners/delivery-partners.module';
import { DeliveryAssignmentsModule } from './modules/delivery-assignments/delivery-assignments.module';
import { DeliveryTrackingModule } from './modules/delivery-tracking/delivery-tracking.module';
import { DeliveryAnalyticsModule } from './modules/delivery-analytics/delivery-analytics.module';
import { DeliveryPayoutsModule } from './modules/delivery-payouts/delivery-payouts.module';
import { DeliverySupportModule } from './modules/delivery-support/delivery-support.module';
import { AdminCustomersModule } from './modules/admin-customers/admin-customers.module';
import { CustomerAuthModule } from './modules/customer-auth/customer-auth.module';
import { CustomerProfileModule } from './modules/customer-profile/customer-profile.module';
import { CustomerDiscoveryModule } from './modules/customer-discovery/customer-discovery.module';
import { CustomerCartModule } from './modules/customer-cart/customer-cart.module';
import { CustomerOrdersModule } from './modules/customer-orders/customer-orders.module';
import { CustomerTrackingModule } from './modules/customer-tracking/customer-tracking.module';
import { CustomerPaymentsModule } from './modules/customer-payments/customer-payments.module';
import { CustomerSupportModule } from './modules/customer-support/customer-support.module';
import { CustomerReviewsModule } from './modules/customer-reviews/customer-reviews.module';
import { typeOrmConfig } from './config/typeorm.config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: typeOrmConfig }),
    PrismaModule,
    AppCacheModule,
    // ─── Existing restaurant/delivery modules ────────────────────────
    AuthModule,
    RestaurantsModule,
    BranchesModule,
    MenusModule,
    DocumentsModule,
    DashboardModule,
    PaymentAnalysisModule,
    DeliveryPartnersModule,
    DeliveryAssignmentsModule,
    DeliveryTrackingModule,
    DeliveryAnalyticsModule,
    DeliveryPayoutsModule,
    DeliverySupportModule,
    AdminCustomersModule,
    // ─── Customer modules ────────────────────────────────────────────
    CustomerAuthModule,
    CustomerProfileModule,
    CustomerDiscoveryModule,
    CustomerCartModule,
    CustomerOrdersModule,
    CustomerTrackingModule,
    CustomerPaymentsModule,
    CustomerSupportModule,
    CustomerReviewsModule,
  ],
})
export class AppModule {}