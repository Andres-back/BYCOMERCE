import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  EstadoGeneral,
  PaymentStatus,
  Prisma,
  RefreshRevokedReason,
  RoleName,
  SubscriptionStatus,
} from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';
import { RequestUser } from '../../common/types/request-user';
import { AuditService } from '../audit/audit.service';
import { AiConfigService } from '../ai/ai-config.service';
import { AiVisionService } from '../ai/ai-vision.service';
import { BrandingVisionDto } from '../ai/dto/vision.dto';
import { UpdateTenantAiSettingsDto } from '../ai/dto/ai-settings.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { RegisterSubscriptionPaymentDto } from './dto/register-subscription-payment.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import {
  CreateBusinessImageDto,
  ReorderBusinessImagesDto,
  UpdateBusinessImageDto,
} from './dto/business-image.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly aiConfig: AiConfigService,
    private readonly aiVision: AiVisionService,
  ) {}

  getBusinessProfile(user: RequestUser) {
    const tenantId = this.requireTenant(user);
    return this.prisma.tenant.findFirstOrThrow({
      where: { id: tenantId },
      include: {
        plan: true,
        businessSettings: true,
        businessImages: { orderBy: { orden: 'asc' } },
        deliveryConfig: true,
        _count: {
          select: {
            products: true,
            orders: true,
            sales: true,
          },
        },
      },
    });
  }

  async getBusinessSettings(user: RequestUser) {
    const tenantId = this.requireTenant(user);
    const settings = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
      select: {
        id: true,
        nombre: true,
        slug: true,
        telefono: true,
        whatsapp: true,
        email: true,
        direccion: true,
        barrio: true,
        ciudad: true,
        latitud: true,
        longitud: true,
        logo: true,
        businessSettings: true,
        deliveryConfig: true,
      },
    });
    if (!settings) throw new NotFoundException('Tenant no encontrado');
    return settings;
  }

  getAiSettings(user: RequestUser) {
    return this.aiConfig.getPublicSettings(this.requireTenant(user));
  }

  async updateAiSettings(user: RequestUser, dto: UpdateTenantAiSettingsDto) {
    const tenantId = this.requireTenant(user);
    const settings = await this.aiConfig.updateTenantSettings(tenantId, dto);

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'NEGOCIO_IA_CONFIGURACION_ACTUALIZADA',
      entidad: 'tenant_ai_settings',
      entidadId: tenantId,
      metadata: {
        assistantEnabled: settings.assistantEnabled,
        visionEnabled: settings.visionEnabled,
        visionProvider: settings.visionProvider,
        hasGroqApiKey: settings.hasGroqApiKey,
      },
    });

    return settings;
  }

  async suggestBrandingFromImage(user: RequestUser, dto: BrandingVisionDto) {
    const tenantId = this.requireTenant(user);
    const suggestion = await this.aiVision.suggestBranding(tenantId, dto);
    const colors = suggestion.extracted;
    const updateData = {
      colorPrimario: colors.colorPrimario ?? undefined,
      colorSecundario: colors.colorSecundario ?? undefined,
      colorAcento: colors.colorAcento ?? undefined,
    };
    const hasColors = Object.values(updateData).some(Boolean);

    if (hasColors) {
      await this.prisma.businessSettings.upsert({
        where: { tenantId },
        create: {
          tenantId,
          ...updateData,
        },
        update: updateData,
      });

      await this.auditService.log({
        tenantId,
        usuarioId: user.id,
        accion: 'NEGOCIO_BRANDING_IA_APLICADO',
        entidad: 'business_settings',
        entidadId: tenantId,
        metadata: updateData,
      });
    }

    return { suggestion, applied: hasColors ? updateData : null };
  }

  async updateBusinessProfile(user: RequestUser, dto: UpdateBusinessProfileDto) {
    const tenantId = this.requireTenant(user);

    const tenant = await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          nombre: dto.nombre,
          tipoNegocio: dto.tipoNegocio,
          telefono: dto.telefono,
          whatsapp: dto.whatsapp,
          email: dto.email,
          direccion: dto.direccion,
          barrio: dto.barrio,
          latitud: dto.latitud,
          longitud: dto.longitud,
          logo: dto.logo,
        },
      });

      await tx.businessSettings.upsert({
        where: { tenantId },
        create: {
          tenantId,
          logo: dto.logo,
          banner: dto.banner,
          eslogan: dto.eslogan,
          whatsapp: dto.whatsapp,
          facebook: dto.facebook,
          instagram: dto.instagram,
          tiktok: dto.tiktok,
          youtube: dto.youtube,
          sitioWeb: dto.sitioWeb,
          colorPrimario: dto.colorPrimario,
          colorSecundario: dto.colorSecundario,
          colorAcento: dto.colorAcento,
          fuente: dto.fuente,
          modoTema: dto.modoTema,
          radioTarjeta: dto.radioTarjeta,
          mostrarPrecios: dto.mostrarPrecios,
          mostrarStock: dto.mostrarStock,
          textoBienvenida: dto.textoBienvenida,
        },
        update: {
          logo: dto.logo,
          banner: dto.banner,
          eslogan: dto.eslogan,
          whatsapp: dto.whatsapp,
          facebook: dto.facebook,
          instagram: dto.instagram,
          tiktok: dto.tiktok,
          youtube: dto.youtube,
          sitioWeb: dto.sitioWeb,
          colorPrimario: dto.colorPrimario,
          colorSecundario: dto.colorSecundario,
          colorAcento: dto.colorAcento,
          fuente: dto.fuente,
          modoTema: dto.modoTema,
          radioTarjeta: dto.radioTarjeta,
          mostrarPrecios: dto.mostrarPrecios,
          mostrarStock: dto.mostrarStock,
          textoBienvenida: dto.textoBienvenida,
        },
      });

      await tx.deliveryConfig.upsert({
        where: { tenantId },
        create: {
          tenantId,
          activo: dto.deliveryActivo ?? false,
          costoBase: dto.deliveryCostoBase,
          radioKm: dto.deliveryRadioKm,
          horarioInicio: dto.deliveryHorarioInicio,
          horarioFin: dto.deliveryHorarioFin,
        },
        update: {
          activo: dto.deliveryActivo,
          costoBase: dto.deliveryCostoBase,
          radioKm: dto.deliveryRadioKm,
          horarioInicio: dto.deliveryHorarioInicio,
          horarioFin: dto.deliveryHorarioFin,
        },
      });

      return tx.tenant.findFirstOrThrow({
        where: { id: tenantId },
        include: {
          plan: true,
          businessSettings: true,
          businessImages: { orderBy: { orden: 'asc' } },
          deliveryConfig: true,
          _count: {
            select: {
              products: true,
              orders: true,
              sales: true,
            },
          },
        },
      });
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'NEGOCIO_CONFIGURACION_ACTUALIZADA',
      entidad: 'Tenant',
      entidadId: tenantId,
      metadata: { nombre: tenant.nombre, slug: tenant.slug },
    });

    return tenant;
  }

  async getSubscription(user: RequestUser) {
    const tenantId = this.requireTenant(user);
    const subscription = await this.findCurrentSubscription(tenantId);
    const usage = await this.getPlanUsage(tenantId);

    return {
      subscription,
      usage,
      limits: {
        usuarios: subscription.plan.limiteUsuarios,
        productos: subscription.plan.limiteProductos,
        almacenamientoGb: subscription.plan.almacenamientoGb,
      },
      status: this.getSubscriptionStatus(subscription),
    };
  }

  async changePlan(user: RequestUser, dto: ChangePlanDto) {
    const tenantId = this.requireTenant(user);
    const current = await this.findCurrentSubscription(tenantId);
    const nextPlan = await this.prisma.plan.findFirst({
      where: { id: dto.planId, estado: EstadoGeneral.ACTIVO },
    });
    if (!nextPlan) throw new NotFoundException('Plan no encontrado');
    if (current.planId === nextPlan.id) {
      return this.getSubscription(user);
    }

    const usage = await this.getPlanUsage(tenantId);
    this.assertPlanCanCoverUsage(nextPlan, usage);

    const updated = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.update({
        where: { id: current.id },
        data: {
          planId: nextPlan.id,
          montoMensual: nextPlan.precio,
        },
        include: { plan: true },
      });

      await tx.tenant.update({
        where: { id: tenantId },
        data: { planId: nextPlan.id },
      });

      return subscription;
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'PLAN_CAMBIADO',
      entidad: 'subscriptions',
      entidadId: current.id,
      oldValue: {
        subscriptionId: current.id,
        planId: current.planId,
        planNombre: current.plan.nombre,
        montoMensual: current.montoMensual,
      },
      newValue: {
        subscriptionId: updated.id,
        planId: updated.planId,
        planNombre: updated.plan.nombre,
        montoMensual: updated.montoMensual,
      },
      metadata: { motivo: dto.motivo, mode: 'manual_mvp' },
    });

    return this.getSubscription(user);
  }

  async cancelSubscription(user: RequestUser, dto: CancelSubscriptionDto) {
    const tenantId = this.requireTenant(user);
    const current = await this.findCurrentSubscription(tenantId);
    if (current.estado === SubscriptionStatus.CANCELADA) {
      return this.getSubscription(user);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.update({
        where: { id: current.id },
        data: { estado: SubscriptionStatus.CANCELADA },
        include: { plan: true },
      });

      await tx.tenant.update({
        where: { id: tenantId },
        data: { estado: EstadoGeneral.CANCELADO },
      });

      await tx.refreshToken.updateMany({
        where: { tenantId, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedReason: RefreshRevokedReason.ADMIN_REVOKE,
        },
      });

      return subscription;
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'SUSCRIPCION_CANCELADA',
      entidad: 'subscriptions',
      entidadId: current.id,
      oldValue: current,
      newValue: updated,
      metadata: { motivo: dto.motivo ?? null, sessionsRevoked: true },
    });

    return this.getSubscription(user);
  }

  async listSubscriptionPayments(user: RequestUser) {
    const tenantId = this.requireTenant(user);
    return this.prisma.payment.findMany({
      where: { tenantId, tipo: 'SUBSCRIPTION' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async registerSubscriptionPayment(user: RequestUser, dto: RegisterSubscriptionPaymentDto) {
    const tenantId = this.requireTenant(user);
    const subscription = await this.findCurrentSubscription(tenantId);

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        tipo: 'SUBSCRIPTION',
        referenciaId: subscription.id,
        metodo: dto.metodo,
        monto: dto.monto,
        estado: PaymentStatus.PENDIENTE,
        comprobanteUrl: dto.comprobanteUrl,
        observaciones: dto.observaciones,
        usuarioId: user.id,
        fechaPago: new Date(),
      },
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'PAGO_SUSCRIPCION_REPORTADO',
      entidad: 'payments',
      entidadId: payment.id,
      newValue: payment,
      metadata: {
        subscriptionId: subscription.id,
        referenciaExterna: dto.referenciaExterna ?? null,
        mode: 'comprobante_pendiente_mvp',
      },
    });

    return payment;
  }

  async listBusinessImages(user: RequestUser) {
    const tenantId = this.requireTenant(user);
    return this.prisma.businessImage.findMany({
      where: { tenantId },
      orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createBusinessImage(user: RequestUser, dto: CreateBusinessImageDto) {
    const tenantId = this.requireTenant(user);
    const lastImage = await this.prisma.businessImage.findFirst({
      where: { tenantId },
      orderBy: { orden: 'desc' },
    });
    const nextOrden = dto.orden ?? (lastImage ? lastImage.orden + 1 : 0);

    const image = await this.prisma.businessImage.create({
      data: {
        tenantId,
        url: dto.url,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        orden: nextOrden,
      },
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'GALERIA_IMAGEN_AGREGADA',
      entidad: 'business_images',
      entidadId: image.id,
      newValue: image,
    });

    return image;
  }

  async updateBusinessImage(user: RequestUser, id: string, dto: UpdateBusinessImageDto) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.businessImage.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Imagen no encontrada');

    const updated = await this.prisma.businessImage.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        orden: dto.orden,
      },
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'GALERIA_IMAGEN_ACTUALIZADA',
      entidad: 'business_images',
      entidadId: id,
      oldValue: existing,
      newValue: updated,
    });

    return updated;
  }

  async deleteBusinessImage(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.businessImage.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Imagen no encontrada');

    await this.prisma.businessImage.delete({ where: { id } });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'GALERIA_IMAGEN_ELIMINADA',
      entidad: 'business_images',
      entidadId: id,
      oldValue: existing,
    });

    return { deleted: true, id };
  }

  async reorderBusinessImages(user: RequestUser, dto: ReorderBusinessImagesDto) {
    const tenantId = this.requireTenant(user);
    const images = await this.prisma.businessImage.findMany({
      where: { tenantId, id: { in: dto.ids } },
      select: { id: true },
    });
    if (images.length !== dto.ids.length) {
      throw new UnprocessableEntityException('Una o más imágenes no pertenecen al tenant');
    }
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.businessImage.update({
          where: { id },
          data: { orden: index },
        }),
      ),
    );
    return this.listBusinessImages(user);
  }

  private requireTenant(user: RequestUser): string {
    if (!user.tenantId || user.rol === RoleName.SUPER_ADMIN) {
      throw new NotFoundException('Tenant no disponible para esta operacion');
    }
    return user.tenantId;
  }

  private async findCurrentSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: [{ fechaFin: 'desc' }, { createdAt: 'desc' }],
    });
    if (!subscription) throw new NotFoundException('Suscripcion no encontrada');
    return subscription;
  }

  private async getPlanUsage(tenantId: string) {
    const [usuarios, productos] = await Promise.all([
      this.prisma.user.count({
        where: {
          tenantId,
          estado: EstadoGeneral.ACTIVO,
          isSuperAdmin: false,
        },
      }),
      this.prisma.product.count({
        where: {
          tenantId,
          estado: EstadoGeneral.ACTIVO,
        },
      }),
    ]);

    return {
      usuarios,
      productos,
      almacenamientoGb: 0,
    };
  }

  private assertPlanCanCoverUsage(
    plan: { limiteUsuarios: number; limiteProductos: number; almacenamientoGb: number },
    usage: { usuarios: number; productos: number; almacenamientoGb: number },
  ) {
    const exceeded = [
      usage.usuarios > plan.limiteUsuarios
        ? { recurso: 'usuarios', uso: usage.usuarios, limite: plan.limiteUsuarios }
        : null,
      usage.productos > plan.limiteProductos
        ? { recurso: 'productos', uso: usage.productos, limite: plan.limiteProductos }
        : null,
      usage.almacenamientoGb > plan.almacenamientoGb
        ? { recurso: 'almacenamientoGb', uso: usage.almacenamientoGb, limite: plan.almacenamientoGb }
        : null,
    ].filter(Boolean);

    if (exceeded.length) {
      throw new UnprocessableEntityException({
        error: 'PLAN_LIMIT_EXCEEDED',
        message: 'El uso actual supera los limites del plan destino',
        details: exceeded,
      });
    }
  }

  private getSubscriptionStatus(
    subscription: Prisma.SubscriptionGetPayload<{ include: { plan: true } }>,
  ) {
    const now = new Date();
    const daysToEnd = Math.ceil((subscription.fechaFin.getTime() - now.getTime()) / 86_400_000);
    return {
      canOperate:
        subscription.estado === SubscriptionStatus.ACTIVA ||
        subscription.estado === SubscriptionStatus.EN_PRUEBA,
      daysToEnd,
      isExpiredByDate: subscription.fechaFin < now,
      requiresPayment:
        subscription.estado === SubscriptionStatus.VENCIDA ||
        subscription.estado === SubscriptionStatus.SUSPENDIDA ||
        subscription.fechaFin < now,
    };
  }
}
