import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../events/event-bus.service';
import { EventCatalog } from '../../events/events.catalog';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationEventListener implements OnModuleInit {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.eventBus.on(EventCatalog.SYSTEM.TENANT_SUSPENDIDO).subscribe((event) => {
      this.notifications.createForTenant(event.tenantId, {
        tipo: 'TENANT_SUSPENDIDO',
        titulo: 'Cuenta suspendida',
        mensaje: 'Tu cuenta ha sido suspendida. Contacta soporte.',
        level: 'error',
        actionUrl: '/admin/settings',
      }).catch((err: Error) => this.logger.error(`Failed to create notification: ${err.message}`));
    });

    this.eventBus.on(EventCatalog.ORDERS.PEDIDO_CREADO).subscribe((event) => {
      this.notifications.createForTenant(event.tenantId, {
        tipo: 'NEW_ORDER',
        titulo: 'Nuevo pedido',
        mensaje: 'Has recibido un nuevo pedido.',
        level: 'info',
        actionUrl: '/admin/orders',
      }).catch((err: Error) => this.logger.error(`Failed to create notification: ${err.message}`));
    });

    this.eventBus.on(EventCatalog.INVENTORY.STOCK_BAJO).subscribe((event) => {
      const productName = typeof event.data['productName'] === 'string' ? event.data['productName'] : 'Desconocido';
      this.notifications.createForTenant(event.tenantId, {
        tipo: 'LOW_STOCK',
        titulo: 'Stock bajo',
        mensaje: `Producto con stock bajo: ${productName}`,
        level: 'warning',
        actionUrl: '/admin/inventory',
      }).catch((err: Error) => this.logger.error(`Failed to create notification: ${err.message}`));
    });

    this.eventBus.on(EventCatalog.SUBSCRIPTION.PAGO_RECIBIDO).subscribe((event) => {
      this.notifications.createForTenant(event.tenantId, {
        tipo: 'PAYMENT_RECEIVED',
        titulo: 'Pago recibido',
        mensaje: 'Tu pago ha sido confirmado. Suscripcion activa.',
        level: 'success',
        actionUrl: '/admin/settings',
      }).catch((err: Error) => this.logger.error(`Failed to create notification: ${err.message}`));
    });

    this.logger.log('Notification event listeners registered');
  }
}
