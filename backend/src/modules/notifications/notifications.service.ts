import { Injectable } from '@nestjs/common';
import { Prisma } from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';
import { RequestUser } from '../../common/types/request-user';
import { CreateNotificationDto } from './dto/notification.dto';
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto } from './dto/notification-template.dto';
import { BulkUpdatePreferencesDto, UpdateNotificationPreferenceDto } from './dto/notification-preference.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        tenantId,
        userId: dto.userId ?? null,
        tipo: dto.tipo,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
        level: dto.level ?? 'info',
        data: dto.data ? (dto.data as Prisma.InputJsonValue) : Prisma.JsonNull,
        actionUrl: dto.actionUrl ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async createForTenant(tenantId: string, dto: CreateNotificationDto) {
    return this.create(tenantId, dto);
  }

  async findForUser(user: RequestUser, page = 1, pageSize = 50) {
    if (!user.tenantId) return { data: [], total: 0, page, pageSize };

    pageSize = Math.min(pageSize, 100);

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [{ userId: user.id }, { userId: { equals: null } }],
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({
        where: {
          tenantId: user.tenantId,
          OR: [{ userId: user.id }, { userId: { equals: null } }],
        },
      }),
    ]);

    return { data, total, page, pageSize };
  }

  async markAsRead(notificationId: string, user: RequestUser) {
    const notification = await this.prisma.notification.findFirstOrThrow({
      where: { id: notificationId },
    });

    if (notification.tenantId !== user.tenantId) {
      throw new Error('Notificacion no pertenece a este tenant');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { leida: true },
    });
  }

  async markAllAsRead(user: RequestUser) {
    if (!user.tenantId) return { updated: 0 };

    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId: user.tenantId,
        OR: [{ userId: user.id }, { userId: { equals: null } }],
        leida: false,
      },
      data: { leida: true },
    });

    return { updated: result.count };
  }

  async getUnreadCount(user: RequestUser) {
    if (!user.tenantId) return { count: 0 };

    const count = await this.prisma.notification.count({
      where: {
        tenantId: user.tenantId,
        OR: [{ userId: user.id }, { userId: { equals: null } }],
        leida: false,
      },
    });

    return { count };
  }

  async delete(notificationId: string, user: RequestUser) {
    const notification = await this.prisma.notification.findFirstOrThrow({
      where: { id: notificationId },
    });

    if (notification.tenantId !== user.tenantId) {
      throw new Error('Notificacion no pertenece a este tenant');
    }

    await this.prisma.notification.delete({ where: { id: notificationId } });
  }

  // Preferences
  async getPreferences(tenantId: string, usuarioId: string) {
    const userPrefs = await this.prisma.notificationPreference.findMany({
      where: { tenantId, usuarioId },
    });
    const allTypes = this.getNotificationTypes();
    return allTypes.map((tipo) => ({
      tipo,
      titulo: this.getNotificationTitle(tipo),
      canales: ['in_app'],
      activo: userPrefs.find((p) => p.tipo === tipo && p.canal === 'in_app')?.activo ?? true,
    }));
  }

  async updatePreference(tenantId: string, usuarioId: string, dto: UpdateNotificationPreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: {
        tenantId_usuarioId_tipo_canal: {
          tenantId, usuarioId, tipo: dto.tipo, canal: dto.canal,
        },
      },
      create: { tenantId, usuarioId, tipo: dto.tipo, canal: dto.canal, activo: dto.activo },
      update: { activo: dto.activo },
    });
  }

  async bulkUpdatePreferences(tenantId: string, usuarioId: string, dto: BulkUpdatePreferencesDto) {
    if (!dto.preferencias?.length) return this.getPreferences(tenantId, usuarioId);
    await Promise.all(
      dto.preferencias.map((p) => this.updatePreference(tenantId, usuarioId, p)),
    );
    return this.getPreferences(tenantId, usuarioId);
  }

  // Templates
  async getTemplates(tenantId: string) {
    return this.prisma.notificationTemplate.findMany({ where: { tenantId } });
  }

  async createTemplate(tenantId: string, dto: CreateNotificationTemplateDto) {
    return this.prisma.notificationTemplate.create({
      data: {
        tenantId,
        tipo: dto.tipo,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
        canales: dto.canales ?? ['in_app'],
        criticidad: dto.criticidad ?? 'INFO',
        activo: dto.activo ?? true,
      },
    });
  }

  async updateTemplate(tenantId: string, id: string, dto: UpdateNotificationTemplateDto) {
    return this.prisma.notificationTemplate.update({
      where: { id },
      data: dto,
    });
  }

  private getNotificationTypes(): string[] {
    return [
      'STOCK_BAJO', 'PEDIDO_NUEVO', 'PEDIDO_CONFIRMADO', 'PEDIDO_CANCELADO',
      'PAGO_RECIBIDO', 'SUSCRIPCION_VENCER', 'SUSCRIPCION_VENCIDA',
      'LIMITE_EXCEDIDO', 'USUARIO_NUEVO', 'LOGIN_SOSPECHOSO',
    ];
  }

  private getNotificationTitle(tipo: string): string {
    const map: Record<string, string> = {
      STOCK_BAJO: 'Stock bajo',
      PEDIDO_NUEVO: 'Nuevo pedido',
      PEDIDO_CONFIRMADO: 'Pedido confirmado',
      PEDIDO_CANCELADO: 'Pedido cancelado',
      PAGO_RECIBIDO: 'Pago recibido',
      SUSCRIPCION_VENCER: 'Suscripción por vencer',
      SUSCRIPCION_VENCIDA: 'Suscripción vencida',
      LIMITE_EXCEDIDO: 'Límite excedido',
      USUARIO_NUEVO: 'Usuario nuevo',
      LOGIN_SOSPECHOSO: 'Inicio de sesión sospechoso',
    };
    return map[tipo] ?? tipo;
  }
}
