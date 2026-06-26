import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from './config/env';
import { csrfMiddleware } from './common/middleware/csrf.middleware';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PlansModule } from './modules/plans/plans.module';
import { PosModule } from './modules/pos/pos.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { EventsModule } from './events/events.module';
import { SuperadminModule } from './modules/superadmin/superadmin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebsocketsModule } from './modules/websockets/websockets.module';
import { JobsModule } from './jobs/jobs.module';
import { EmailModule } from './modules/email/email.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { BranchesModule } from './modules/branches/branches.module';
import { BusinessTypesModule } from './modules/business-types/business-types.module';
import { AiModule } from './modules/ai/ai.module';

type RequestWithId = Request & { id?: string };

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      load: [env],
    }),
    DatabaseModule,
    AiModule,
    AuditModule,
    AuthModule,
    CustomersModule,
    FinanceModule,
    HealthModule,
    InventoryModule,
    MarketplaceModule,
    OrdersModule,
    PlansModule,
    PosModule,
    ReportsModule,
    TenantsModule,
    UsersModule,
    EventsModule,
    SuperadminModule,
    NotificationsModule,
    WebsocketsModule,
    JobsModule,
    EmailModule,
    UploadsModule,
    AssistantModule,
    PromotionsModule,
    LoyaltyModule,
    BranchesModule,
    BusinessTypesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply((req: RequestWithId, res: Response, next: NextFunction) => {
        const requestId = req.header('x-request-id') ?? randomUUID();
        req.id = requestId;
        res.setHeader('x-request-id', requestId);
        next();
      }, csrfMiddleware)
      .forRoutes('*');
  }
}
