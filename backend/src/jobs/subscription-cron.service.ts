import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EstadoGeneral, SubscriptionStatus } from '../database/prisma-client';
import { PrismaService } from '../database/prisma.service';
import { EventBusService } from '../events/event-bus.service';
import { EventCatalog } from '../events/events.catalog';
import { NotificationsService } from '../modules/notifications/notifications.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processExpiredSubscriptions() {
    this.logger.log('Processing expired subscriptions...');

    const expired = await this.prisma.subscription.findMany({
      where: {
        estado: { in: [SubscriptionStatus.ACTIVA, SubscriptionStatus.EN_PRUEBA] },
        fechaFin: { lt: new Date() },
      },
      include: { tenant: { select: { id: true, nombre: true } } },
    });

    let processed = 0;

    for (const sub of expired) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: sub.id },
            data: { estado: SubscriptionStatus.VENCIDA },
          });

          await tx.tenant.update({
            where: { id: sub.tenantId },
            data: { estado: EstadoGeneral.SUSPENDIDO },
          });
        });

        await this.notifications.createForTenant(sub.tenantId, {
          tipo: 'SUBSCRIPTION_EXPIRED',
          titulo: 'Suscripcion vencida',
          mensaje: 'Tu suscripcion ha vencido. Actualiza tu pago para reactivar.',
          level: 'error',
          actionUrl: '/admin/settings',
        });

        this.eventBus.emit(EventCatalog.SYSTEM.TENANT_SUSPENDIDO, sub.tenantId, {
          tenantId: sub.tenantId, reason: 'SUBSCRIPTION_EXPIRED',
        });

        processed++;
      } catch (err) {
        this.logger.error(`Failed to process subscription ${sub.id}: ${String(err)}`);
      }
    }

    this.logger.log(`Expired subscriptions processed: ${processed}`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyExpiringSoon() {
    this.logger.log('Checking subscriptions expiring soon...');

    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiringSoon = await this.prisma.subscription.findMany({
      where: {
        estado: { in: [SubscriptionStatus.ACTIVA, SubscriptionStatus.EN_PRUEBA] },
        fechaFin: { lte: sevenDays },
      },
      include: { tenant: { select: { id: true, nombre: true } } },
    });

    for (const sub of expiringSoon) {
      const daysLeft = Math.ceil((sub.fechaFin.getTime() - Date.now()) / 86_400_000);
      if (daysLeft <= 3) {
        await this.notifications.createForTenant(sub.tenantId, {
          tipo: 'SUBSCRIPTION_EXPIRING_SOON',
          titulo: 'Suscripcion por vencer',
          mensaje: `Tu suscripcion vence en ${daysLeft} dia(s). Renueva para evitar interrupcion.`,
          level: 'warning',
          actionUrl: '/admin/settings',
        });
      }
    }

    this.logger.log(`Expiring-soon notifications sent for ${expiringSoon.length} tenants`);
  }
}
