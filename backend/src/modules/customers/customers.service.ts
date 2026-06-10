import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, RoleName } from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';
import { RequestUser } from '../../common/types/request-user';
import { AuditService } from '../audit/audit.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

export type CustomerSegment = 'NUEVO' | 'FRECUENTE' | 'VIP' | 'INACTIVO';

export interface CustomerStats {
  totalSpent: number;
  salesTotal: number;
  ordersTotal: number;
  purchases: number;
  salesCount: number;
  deliveredOrdersCount: number;
  ordersCount: number;
  averageTicket: number;
  lastPurchaseAt: Date | null;
  segment: CustomerSegment;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listCustomers(user: RequestUser, query: CustomerQueryDto) {
    const tenantId = this.requireTenant(user);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where = {
      tenantId,
      ...(query.q?.trim()
        ? {
            OR: [
              { nombre: { contains: query.q.trim(), mode: 'insensitive' as const } },
              { telefono: { contains: this.normalizePhone(query.q), mode: 'insensitive' as const } },
              { email: { contains: query.q.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [customers, totalItems] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    const enriched = await this.attachStats(tenantId, customers);
    const segment = query.segment && query.segment !== 'TODOS' ? query.segment : null;
    const data = segment ? enriched.filter((customer) => customer.stats.segment === segment) : enriched;

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(Math.ceil(totalItems / pageSize), 1),
      },
    };
  }

  async getCustomer(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        sales: {
          orderBy: { fecha: 'desc' },
          take: 50,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    nombre: true,
                    sku: true,
                    precio: true,
                    imagenPrincipal: true,
                  },
                },
              },
            },
            payments: true,
          },
        },
        orders: {
          orderBy: { fecha: 'desc' },
          take: 50,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    nombre: true,
                    sku: true,
                    precio: true,
                    imagenPrincipal: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const [withStats] = await this.attachStats(tenantId, [customer]);
    return {
      ...customer,
      stats: withStats.stats,
    };
  }

  async getCustomerHistory(user: RequestUser, id: string) {
    const customer = await this.getCustomer(user, id);
    return {
      customer: {
        id: customer.id,
        nombre: customer.nombre,
        telefono: customer.telefono,
        email: customer.email,
      },
      stats: customer.stats,
      sales: customer.sales,
      orders: customer.orders,
    };
  }

  async createCustomer(user: RequestUser, dto: CreateCustomerDto) {
    const tenantId = this.requireTenant(user);
    const telefono = this.normalizeRequiredPhone(dto.telefono);

    const existing = await this.prisma.customer.findUnique({
      where: { tenantId_telefono: { tenantId, telefono } },
    });
    if (existing) {
      throw new ConflictException('Ya existe un cliente con este telefono');
    }

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        nombre: dto.nombre,
        telefono,
        email: dto.email,
        direccion: dto.direccion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        observaciones: dto.observaciones,
      },
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'CLIENTE_CREADO',
      entidad: 'customers',
      entidadId: customer.id,
      newValue: customer,
    });

    const [withStats] = await this.attachStats(tenantId, [customer]);
    return withStats;
  }

  async updateCustomer(user: RequestUser, id: string, dto: UpdateCustomerDto) {
    const tenantId = this.requireTenant(user);
    const current = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!current) throw new NotFoundException('Cliente no encontrado');

    const telefono = dto.telefono ? this.normalizeRequiredPhone(dto.telefono) : undefined;
    if (telefono && telefono !== current.telefono) {
      const existing = await this.prisma.customer.findUnique({
        where: { tenantId_telefono: { tenantId, telefono } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un cliente con este telefono');
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id: current.id },
      data: {
        nombre: dto.nombre,
        telefono,
        email: dto.email,
        direccion: dto.direccion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        observaciones: dto.observaciones,
      },
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'CLIENTE_ACTUALIZADO',
      entidad: 'customers',
      entidadId: updated.id,
      oldValue: current,
      newValue: updated,
    });

    const [withStats] = await this.attachStats(tenantId, [updated]);
    return withStats;
  }

  async deleteCustomer(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { sales: true, orders: true } } },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    if (customer._count.sales > 0 || customer._count.orders > 0) {
      throw new ConflictException('No se puede eliminar un cliente con historial comercial');
    }

    await this.prisma.customer.delete({ where: { id: customer.id } });
    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'CLIENTE_ELIMINADO',
      entidad: 'customers',
      entidadId: customer.id,
      oldValue: customer,
    });

    return { id: customer.id, deleted: true };
  }

  private async attachStats<T extends { id: string; createdAt: Date }>(tenantId: string, customers: T[]) {
    const ids = customers.map((customer) => customer.id);
    if (ids.length === 0) {
      return customers.map((customer) => ({ ...customer, stats: this.emptyStats(customer.createdAt) }));
    }

    const [sales, deliveredOrders, allOrders, lastSales, lastDeliveredOrders] = await Promise.all([
      this.prisma.sale.groupBy({
        by: ['customerId'],
        where: { tenantId, customerId: { in: ids } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ['customerId'],
        where: { tenantId, customerId: { in: ids }, estado: OrderStatus.ENTREGADO },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ['customerId'],
        where: { tenantId, customerId: { in: ids } },
        _count: { _all: true },
      }),
      this.prisma.sale.findMany({
        where: { tenantId, customerId: { in: ids } },
        orderBy: { fecha: 'desc' },
        distinct: ['customerId'],
        select: { customerId: true, fecha: true },
      }),
      this.prisma.order.findMany({
        where: { tenantId, customerId: { in: ids }, estado: OrderStatus.ENTREGADO },
        orderBy: { fecha: 'desc' },
        distinct: ['customerId'],
        select: { customerId: true, fecha: true },
      }),
    ]);

    const salesByCustomer = new Map(sales.map((item) => [item.customerId, item]));
    const deliveredOrdersByCustomer = new Map(deliveredOrders.map((item) => [item.customerId, item]));
    const allOrdersByCustomer = new Map(allOrders.map((item) => [item.customerId, item]));
    const lastSalesByCustomer = new Map(lastSales.map((item) => [item.customerId, item.fecha]));
    const lastOrdersByCustomer = new Map(lastDeliveredOrders.map((item) => [item.customerId, item.fecha]));

    return customers.map((customer) => {
      const sale = salesByCustomer.get(customer.id);
      const deliveredOrder = deliveredOrdersByCustomer.get(customer.id);
      const salesTotal = sale?._sum.total ?? 0;
      const ordersTotal = deliveredOrder?._sum.total ?? 0;
      const salesCount = sale?._count._all ?? 0;
      const deliveredOrdersCount = deliveredOrder?._count._all ?? 0;
      const ordersCount = allOrdersByCustomer.get(customer.id)?._count._all ?? 0;
      const purchases = salesCount + deliveredOrdersCount;
      const totalSpent = salesTotal + ordersTotal;
      const lastPurchaseAt = this.latestDate(
        lastSalesByCustomer.get(customer.id) ?? null,
        lastOrdersByCustomer.get(customer.id) ?? null,
      );

      const stats: CustomerStats = {
        totalSpent,
        salesTotal,
        ordersTotal,
        purchases,
        salesCount,
        deliveredOrdersCount,
        ordersCount,
        averageTicket: purchases > 0 ? Math.round(totalSpent / purchases) : 0,
        lastPurchaseAt,
        segment: this.segmentCustomer(customer.createdAt, totalSpent, purchases, lastPurchaseAt),
      };

      return { ...customer, stats };
    });
  }

  private segmentCustomer(createdAt: Date, totalSpent: number, purchases: number, lastPurchaseAt: Date | null): CustomerSegment {
    const now = Date.now();
    const createdDays = (now - createdAt.getTime()) / 86_400_000;
    const inactiveDays = lastPurchaseAt ? (now - lastPurchaseAt.getTime()) / 86_400_000 : null;

    if (inactiveDays !== null && inactiveDays > 90) return 'INACTIVO';
    if (totalSpent >= 50000000 || purchases >= 8) return 'VIP';
    if (purchases >= 3) return 'FRECUENTE';
    if (createdDays <= 30) return 'NUEVO';
    return 'INACTIVO';
  }

  private emptyStats(createdAt: Date): CustomerStats {
    return {
      totalSpent: 0,
      salesTotal: 0,
      ordersTotal: 0,
      purchases: 0,
      salesCount: 0,
      deliveredOrdersCount: 0,
      ordersCount: 0,
      averageTicket: 0,
      lastPurchaseAt: null,
      segment: this.segmentCustomer(createdAt, 0, 0, null),
    };
  }

  private latestDate(a: Date | null, b: Date | null) {
    if (!a) return b;
    if (!b) return a;
    return a.getTime() > b.getTime() ? a : b;
  }

  private normalizeRequiredPhone(value: string) {
    const normalized = this.normalizePhone(value);
    if (!normalized) throw new BadRequestException('Telefono invalido');
    return normalized;
  }

  private normalizePhone(value?: string) {
    return value?.replace(/[^0-9]/g, '') ?? '';
  }

  private requireTenant(user: RequestUser): string {
    if (!user.tenantId || user.rol === RoleName.SUPER_ADMIN) {
      throw new NotFoundException('Tenant no disponible para esta operacion');
    }
    return user.tenantId;
  }
}
