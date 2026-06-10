import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from './prisma-client';
import { TenantContextService } from './tenant-context.service';

const TENANT_MODELS = new Set<string>([
  'User',
  'Subscription',
  'Category',
  'Product',
  'ProductVariant',
  'ProductSupplier',
  'Supplier',
  'Purchase',
  'InventoryMovement',
  'StockReservation',
  'CashRegister',
  'CashMovement',
  'Customer',
  'Sale',
  'Expense',
  'Order',
  'DeliveryConfig',
  'BusinessSettings',
  'AuditLog',
  'RefreshToken',
  'Payment',
  'SalePayment',
  'Notification',
  'Promotion',
  'PromotionProduct',
  'Coupon',
  'TenantBranch',
]);

type PrismaArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly tenantContext: TenantContextService) {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    this.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<unknown>) => {
      const tenantId = this.tenantContext.getTenantId();
      if (
        !params.model ||
        !TENANT_MODELS.has(params.model) ||
        !tenantId ||
        this.tenantContext.shouldBypassTenantFilter()
      ) {
        return next(params);
      }

      const args = (params.args ?? {}) as PrismaArgs;

      if (['findMany', 'findFirst', 'count', 'aggregate'].includes(params.action)) {
        args.where = { ...(args.where ?? {}), tenantId };
        params.args = args;
      }

      if (['create'].includes(params.action) && args.data && !Array.isArray(args.data)) {
        args.data = { ...args.data, tenantId };
        params.args = args;
      }

      if (params.action === 'createMany' && Array.isArray(args.data)) {
        args.data = args.data.map((item) => ({ ...item, tenantId }));
        params.args = args;
      }

      if (['updateMany', 'deleteMany'].includes(params.action)) {
        args.where = { ...(args.where ?? {}), tenantId };
        params.args = args;
      }

      return next(params);
    });

    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
