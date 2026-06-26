import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoGeneral,
  PaymentStatus,
  RefreshRevokedReason,
  SubscriptionStatus,
} from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';
import { EventCatalog } from '../../events/events.catalog';
import {
  CreateTenantDto,
  CreatePlanDto,
  UpdatePlanDto,
  CreateUserForTenantDto,
  AuditLogQueryDto,
} from './dto/superadmin.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../../database/prisma-client';

@Injectable()
export class SuperadminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  async listTenants(filters?: { q?: string; estado?: string; page?: number; pageSize?: number }) {
    const page = filters?.page ?? 1;
    const pageSize = Math.min(filters?.pageSize ?? 50, 200);
    const where: Record<string, unknown> = {};

    if (filters?.q) {
      where.OR = [
        { nombre: { contains: filters.q, mode: 'insensitive' } },
        { slug: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    if (filters?.estado) {
      where.estado = filters.estado;
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: { select: { id: true, nombre: true } },
          _count: {
            select: { users: true, products: true, sales: true, orders: true },
          },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { estado: true, fechaFin: true, montoMensual: true },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { data: tenants, total, page, pageSize };
  }

  async createTenant(dto: CreateTenantDto, adminId: string) {
    const slugExists = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (slugExists) throw new ConflictException('El slug ya esta en uso');

    const emailExists = await this.prisma.user.findFirst({
      where: { email: dto.adminEmail, tenantId: { not: null } },
    });
    if (emailExists) throw new ConflictException('Email ya registrado como admin de otro tenant');

    const plan = await this.prisma.plan.findFirst({ where: { id: dto.planId, estado: EstadoGeneral.ACTIVO } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const passwordHash = await bcrypt.hash(dto.adminPassword, 4);
    const diasPrueba = dto.diasPrueba ?? 14;

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          nombre: dto.nombre,
          slug: dto.slug,
          tipoNegocio: dto.tipoNegocio,
          planId: dto.planId,
          telefono: dto.telefono,
          direccion: dto.direccion,
          barrio: dto.barrio,
          ciudad: dto.ciudad ?? 'Mocoa',
          estado: EstadoGeneral.ACTIVO,
          businessSettings: { create: {} },
          deliveryConfig: { create: { activo: false } },
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: dto.planId,
          montoMensual: plan.precio,
          estado: SubscriptionStatus.EN_PRUEBA,
          fechaInicio: new Date(),
          fechaFin: new Date(Date.now() + diasPrueba * 24 * 60 * 60 * 1000),
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          nombre: dto.adminNombre,
          email: dto.adminEmail.toLowerCase(),
          passwordHash,
          rol: 'ADMIN_NEGOCIO',
          estado: EstadoGeneral.ACTIVO,
          isSuperAdmin: false,
        },
      });

      return { tenant, subscription, user };
    });

    await this.audit.log({
      tenantId: result.tenant.id,
      usuarioId: adminId,
      accion: 'TENANT_CREADO_SUPERADMIN',
      entidad: 'tenants',
      entidadId: result.tenant.id,
      newValue: { nombre: dto.nombre, slug: dto.slug, plan: plan.nombre, diasPrueba },
    });

    this.eventBus.emit(EventCatalog.SYSTEM.TENANT_ACTIVO, result.tenant.id, result.tenant);

    return {
      tenant: result.tenant,
      subscription: result.subscription,
      admin: { id: result.user.id, nombre: result.user.nombre, email: result.user.email },
      password: dto.adminPassword,
    };
  }

  async getTenantDetail(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirstOrThrow({
      where: { id: tenantId },
      include: {
        plan: true,
        users: {
          select: { id: true, nombre: true, email: true, rol: true, estado: true },
          orderBy: { createdAt: 'asc' },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        businessSettings: true,
        deliveryConfig: true,
        _count: {
          select: { users: true, products: true, sales: true, orders: true },
        },
      },
    });

    const payments = await this.prisma.payment.findMany({
      where: { tenantId, tipo: 'SUBSCRIPTION' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { tenant, payments };
  }

  async getTenantProducts(
    tenantId: string,
    filters?: { q?: string; page?: number; pageSize?: number },
  ) {
    const page = filters?.page ?? 1;
    const pageSize = Math.min(filters?.pageSize ?? 50, 200);
    const where: Record<string, unknown> = { tenantId };

    if (filters?.q) {
      where.OR = [
        { nombre: { contains: filters.q, mode: 'insensitive' } },
        { sku: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, nombre: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data: products, total, page, pageSize };
  }

  async getTenantOrders(
    tenantId: string,
    filters?: { page?: number; pageSize?: number },
  ) {
    const page = filters?.page ?? 1;
    const pageSize = Math.min(filters?.pageSize ?? 50, 200);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { tenantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { fecha: 'desc' },
        include: {
          customer: { select: { id: true, nombre: true, telefono: true } },
          items: { include: { product: { select: { id: true, nombre: true } } } },
        },
      }),
      this.prisma.order.count({ where: { tenantId } }),
    ]);

    return { data: orders, total, page, pageSize };
  }

  async getTenantSales(
    tenantId: string,
    filters?: { page?: number; pageSize?: number },
  ) {
    const page = filters?.page ?? 1;
    const pageSize = Math.min(filters?.pageSize ?? 50, 200);

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { fecha: 'desc' },
        include: {
          customer: { select: { id: true, nombre: true } },
          items: { include: { product: { select: { id: true, nombre: true } } } },
          user: { select: { id: true, nombre: true } },
        },
      }),
      this.prisma.sale.count({ where: { tenantId } }),
    ]);

    return { data: sales, total, page, pageSize };
  }

  async createUserForTenant(tenantId: string, dto: CreateUserForTenantDto, adminId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId },
    });
    if (existing) throw new ConflictException('Email ya registrado en este tenant');

    const password = dto.password ?? randomBytes(5).toString('hex');
    const passwordHash = await bcrypt.hash(password, 4);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        nombre: dto.nombre,
        email: dto.email.toLowerCase(),
        passwordHash,
        rol: dto.rol,
        estado: EstadoGeneral.ACTIVO,
      },
    });

    await this.audit.log({
      tenantId,
      usuarioId: adminId,
      accion: 'USUARIO_CREADO_SUPERADMIN',
      entidad: 'users',
      entidadId: user.id,
      newValue: { nombre: user.nombre, email: user.email, rol: user.rol },
    });

    return { user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }, password };
  }

  async suspendTenant(tenantId: string, motivo?: string, adminId?: string) {
    const tenant = await this.prisma.tenant.findFirstOrThrow({
      where: { id: tenantId },
    });

    if (tenant.estado === EstadoGeneral.SUSPENDIDO) {
      throw new BadRequestException('Tenant ya esta suspendido');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: { estado: EstadoGeneral.SUSPENDIDO },
      });

      const subscription = await tx.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      if (subscription && subscription.estado !== SubscriptionStatus.CANCELADA) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { estado: SubscriptionStatus.SUSPENDIDA },
        });
      }

      await tx.refreshToken.updateMany({
        where: { tenantId, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedReason: RefreshRevokedReason.ADMIN_REVOKE,
        },
      });
    });

    await this.audit.log({
      tenantId,
      usuarioId: adminId,
      accion: 'TENANT_SUSPENDIDO_SUPERADMIN',
      entidad: 'tenants',
      entidadId: tenantId,
      metadata: { motivo },
    });

    this.eventBus.emit(EventCatalog.SYSTEM.TENANT_SUSPENDIDO, tenantId, { tenantId, motivo });
  }

  async reactivateTenant(tenantId: string, adminId?: string) {
    const tenant = await this.prisma.tenant.findFirstOrThrow({
      where: { id: tenantId },
    });

    if (tenant.estado === EstadoGeneral.ACTIVO) {
      throw new BadRequestException('Tenant ya esta activo');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: { estado: EstadoGeneral.ACTIVO },
      });

      const subscription = await tx.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      if (subscription && subscription.estado === SubscriptionStatus.SUSPENDIDA) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { estado: SubscriptionStatus.EN_PRUEBA, fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        });
      }
    });

    await this.audit.log({
      tenantId,
      usuarioId: adminId,
      accion: 'TENANT_REACTIVADO_SUPERADMIN',
      entidad: 'tenants',
      entidadId: tenantId,
    });

    this.eventBus.emit(EventCatalog.SYSTEM.TENANT_ACTIVO, tenantId, { tenantId });
  }

  async listAllPlans(includeInactive = false) {
    return this.prisma.plan.findMany({
      where: includeInactive ? {} : { estado: EstadoGeneral.ACTIVO },
      orderBy: { precio: 'asc' },
    });
  }

  async createPlan(dto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({ where: { nombre: dto.nombre } });
    if (existing) throw new ConflictException('Plan con ese nombre ya existe');

    const plan = await this.prisma.plan.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        precio: dto.precio,
        limiteUsuarios: dto.limiteUsuarios,
        limiteProductos: dto.limiteProductos,
        almacenamientoGb: dto.almacenamientoGb ?? 1,
        caracteristicas: dto.caracteristicas ?? [],
        estado: EstadoGeneral.ACTIVO,
      },
    });

    await this.audit.log({
      tenantId: null,
      usuarioId: 'superadmin-sys',
      accion: 'PLAN_CREADO',
      entidad: 'plans',
      entidadId: plan.id,
      newValue: plan,
    });

    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findFirst({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    if (dto.nombre && dto.nombre !== plan.nombre) {
      const existing = await this.prisma.plan.findUnique({ where: { nombre: dto.nombre } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Plan con ese nombre ya existe');
      }
    }

    let updated;
    try {
      updated = await this.prisma.plan.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
          ...(dto.precio !== undefined ? { precio: dto.precio } : {}),
          ...(dto.limiteUsuarios !== undefined ? { limiteUsuarios: dto.limiteUsuarios } : {}),
          ...(dto.limiteProductos !== undefined ? { limiteProductos: dto.limiteProductos } : {}),
          ...(dto.almacenamientoGb !== undefined ? { almacenamientoGb: dto.almacenamientoGb } : {}),
          ...(dto.caracteristicas !== undefined ? { caracteristicas: dto.caracteristicas } : {}),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Plan con ese nombre ya existe');
      }
      throw error;
    }

    await this.audit.log({
      tenantId: null,
      usuarioId: 'superadmin-sys',
      accion: 'PLAN_ACTUALIZADO',
      entidad: 'plans',
      entidadId: updated.id,
      newValue: updated,
    });

    return updated;
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.plan.findFirst({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const deleted = await this.prisma.plan.update({
      where: { id },
      data: { estado: EstadoGeneral.INACTIVO },
    });

    await this.audit.log({
      tenantId: null,
      usuarioId: 'superadmin-sys',
      accion: 'PLAN_ELIMINADO',
      entidad: 'plans',
      entidadId: deleted.id,
      newValue: deleted,
    });

    return deleted;
  }

  async getAuditLogs(query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const where: Record<string, unknown> = {};

    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.accion) where.accion = query.accion;
    if (query.userId) where.usuarioId = query.userId;
    if (query.from || query.to) {
      const createdAt: Record<string, Date> = {};
      if (query.from) createdAt.gte = new Date(query.from);
      if (query.to) createdAt.lte = new Date(query.to);
      where.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, nombre: true, slug: true } },
          user: { select: { id: true, nombre: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: logs, total, page, pageSize };
  }

  async listPendingPayments(page = 1, pageSize = 50) {
    pageSize = Math.min(pageSize, 200);

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { estado: PaymentStatus.PENDIENTE },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, nombre: true, slug: true } },
        },
      }),
      this.prisma.payment.count({ where: { estado: PaymentStatus.PENDIENTE } }),
    ]);

    return { data: payments, total, page, pageSize };
  }

  async confirmPayment(paymentId: string, superAdminId: string, observaciones?: string) {
    const payment = await this.prisma.payment.findFirstOrThrow({
      where: { id: paymentId },
    });

    if (payment.estado !== PaymentStatus.PENDIENTE) {
      throw new BadRequestException('Solo pagos pendientes pueden confirmarse');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          estado: PaymentStatus.COMPLETADO,
          observaciones: observaciones ?? payment.observaciones,
        },
      });

      if (payment.tipo === 'SUBSCRIPTION' && payment.tenantId) {
        const subscription = await tx.subscription.findFirst({
          where: { tenantId: payment.tenantId },
          orderBy: [{ fechaFin: 'desc' }, { createdAt: 'desc' }],
        });

        if (subscription && subscription.estado !== SubscriptionStatus.CANCELADA) {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              estado: SubscriptionStatus.ACTIVA,
              fechaInicio: new Date(),
              fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              fechaProximoCobro: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              ultimoPago: new Date(),
            },
          });

          await tx.tenant.update({
            where: { id: payment.tenantId },
            data: { estado: EstadoGeneral.ACTIVO },
          });
        }
      }

      return p;
    });

    await this.audit.log({
      tenantId: payment.tenantId,
      usuarioId: superAdminId,
      accion: 'PAGO_CONFIRMADO_SUPERADMIN',
      entidad: 'payments',
      entidadId: paymentId,
      newValue: updated,
      metadata: { observaciones, tipo: payment.tipo },
    });

    this.eventBus.emit(EventCatalog.SUBSCRIPTION.PAGO_RECIBIDO, payment.tenantId ?? 'system', {
      paymentId, tenantId: payment.tenantId, monto: payment.monto,
    });

    return updated;
  }

  async rejectPayment(paymentId: string, superAdminId: string, motivo?: string) {
    const payment = await this.prisma.payment.findFirstOrThrow({
      where: { id: paymentId },
    });

    if (payment.estado !== PaymentStatus.PENDIENTE) {
      throw new BadRequestException('Solo pagos pendientes pueden rechazarse');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        estado: PaymentStatus.FALLIDO,
        observaciones: motivo ?? payment.observaciones,
      },
    });

    await this.audit.log({
      tenantId: payment.tenantId,
      usuarioId: superAdminId,
      accion: 'PAGO_RECHAZADO_SUPERADMIN',
      entidad: 'payments',
      entidadId: paymentId,
      newValue: updated,
      metadata: { motivo },
    });

    return updated;
  }

  async impersonate(
    targetUserId: string,
    superAdminUser: { id: string; tenantId: string | null },
  ) {
    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId },
      include: { tenant: { select: { id: true, slug: true, nombre: true } } },
    });

    if (!targetUser) throw new NotFoundException('Usuario no encontrado');
    if (targetUser.isSuperAdmin) {
      throw new ForbiddenException('No se puede impersonar otro SUPER_ADMIN');
    }

    return {
      userId: targetUser.id,
      email: targetUser.email,
      nombre: targetUser.nombre,
      rol: targetUser.rol,
      tenantId: targetUser.tenantId,
      tenant: targetUser.tenant,
      impersonatedBy: superAdminUser.id,
    };
  }

  async getSystemStats() {
    const [totalTenants, tenantsActivos, totalUsers, totalProducts, totalSales, totalOrders] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { estado: EstadoGeneral.ACTIVO } }),
        this.prisma.user.count({ where: { isSuperAdmin: false } }),
        this.prisma.product.count(),
        this.prisma.sale.count(),
        this.prisma.order.count(),
      ]);

    const pendingPayments = await this.prisma.payment.count({
      where: { estado: PaymentStatus.PENDIENTE },
    });

    return {
      totalTenants,
      tenantsActivos,
      totalUsers,
      totalProducts,
      totalSales,
      totalOrders,
      pendingPayments,
      pendingPaymentsMonto: (
        await this.prisma.payment.aggregate({
          where: { estado: PaymentStatus.PENDIENTE },
          _sum: { monto: true },
        })
      )._sum.monto ?? 0,
    };
  }
}
