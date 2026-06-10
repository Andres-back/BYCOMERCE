import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CashMovementType,
  EstadoGeneral,
  OrderStatus,
  RoleName,
} from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';
import { RequestUser } from '../../common/types/request-user';
import { ReportQueryDto } from './dto/report-query.dto';

interface ReportRange {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: RequestUser, query: ReportQueryDto) {
    const tenantId = this.requireTenant(user);
    const range = this.resolveRange(query);
    const todayRange = this.resolveTodayRange();

    const [
      salesSummary,
      previousSalesSummary,
      todaySalesSummary,
      monthSalesSummary,
      activeOrders,
      pendingOrders,
      lowStock,
      outOfStock,
      customersNew,
      customersTotal,
      expensesToday,
      cashBalance,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      this.aggregateSales(tenantId, range.from, range.to),
      this.aggregateSales(tenantId, range.previousFrom, range.previousTo),
      this.aggregateSales(tenantId, todayRange.from, todayRange.to),
      this.aggregateSales(tenantId, this.startOfMonth(todayRange.to), todayRange.to),
      this.prisma.order.count({
        where: {
          tenantId,
          estado: {
            in: [
              OrderStatus.PENDIENTE,
              OrderStatus.CONFIRMADO,
              OrderStatus.PREPARANDO,
              OrderStatus.LISTO_PARA_ENTREGA,
              OrderStatus.EN_CAMINO,
            ],
          },
        },
      }),
      this.prisma.order.count({ where: { tenantId, estado: OrderStatus.PENDIENTE } }),
      this.prisma.product.count({
        where: {
          tenantId,
          estado: EstadoGeneral.ACTIVO,
          stock: { gt: 0 },
          stockMinimo: { gt: 0 },
          AND: [{ stock: { lte: this.prisma.product.fields.stockMinimo } }],
        },
      }),
      this.prisma.product.count({
        where: { tenantId, estado: EstadoGeneral.ACTIVO, stock: { lte: 0 } },
      }),
      this.prisma.customer.count({
        where: { tenantId, createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.expense.aggregate({
        where: { tenantId, fecha: { gte: todayRange.from, lte: todayRange.to } },
        _sum: { valor: true },
      }),
      this.getCashBalance(tenantId),
      this.getTopProducts(tenantId, range.from, range.to, 5),
      this.prisma.order.findMany({
        where: { tenantId },
        orderBy: { fecha: 'desc' },
        take: 5,
        include: { customer: true },
      }),
    ]);

    const estimatedCost = await this.getEstimatedCost(tenantId, range.from, range.to);
    const expenses = await this.getExpensesTotal(tenantId, range.from, range.to);
    const estimatedProfit = salesSummary.total - estimatedCost - expenses;

    return {
      range: this.serializeRange(range),
      kpis: {
        salesToday: todaySalesSummary.total,
        salesMonth: monthSalesSummary.total,
        salesRange: salesSummary.total,
        previousSalesRange: previousSalesSummary.total,
        salesGrowthPercent: this.percentChange(salesSummary.total, previousSalesSummary.total),
        transactions: salesSummary.count,
        averageTicket: this.average(salesSummary.total, salesSummary.count),
        estimatedCost,
        expenses,
        expensesToday: expensesToday._sum.valor ?? 0,
        estimatedProfit,
        activeOrders,
        pendingOrders,
        lowStock,
        outOfStock,
        customersNew,
        customersTotal,
        cashBalance,
      },
      topProducts,
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        estado: order.estado,
        total: order.total,
        fecha: order.fecha,
        customerName: order.customer?.nombre ?? null,
      })),
    };
  }

  async getSalesReport(user: RequestUser, query: ReportQueryDto) {
    const tenantId = this.requireTenant(user);
    const range = this.resolveRange(query);
    const [summary, paymentMethods, daily] = await Promise.all([
      this.aggregateSales(tenantId, range.from, range.to),
      this.prisma.sale.groupBy({
        by: ['metodoPago'],
        where: { tenantId, estado: EstadoGeneral.ACTIVO, fecha: { gte: range.from, lte: range.to } },
        _sum: { total: true, descuento: true },
        _count: { _all: true },
        orderBy: { _sum: { total: 'desc' } },
      }),
      this.prisma.sale.findMany({
        where: { tenantId, estado: EstadoGeneral.ACTIVO, fecha: { gte: range.from, lte: range.to } },
        select: { fecha: true, total: true, descuento: true },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    return {
      range: this.serializeRange(range),
      summary: {
        ...summary,
        averageTicket: this.average(summary.total, summary.count),
      },
      paymentMethods: await this.netPaymentMethods(tenantId, range.from, range.to, paymentMethods.map((item) => ({
        metodo: item.metodoPago,
        total: item._sum.total ?? 0,
        descuento: item._sum.descuento ?? 0,
        count: item._count._all,
      }))),
      daily: this.groupDailyTotals([
        ...daily,
        ...(await this.getRefundDailyRows(tenantId, range.from, range.to)),
      ]),
    };
  }

  async getProductsReport(user: RequestUser, query: ReportQueryDto) {
    const tenantId = this.requireTenant(user);
    const range = this.resolveRange(query);
    const [topProducts, slowProducts] = await Promise.all([
      this.getTopProducts(tenantId, range.from, range.to, 20),
      this.prisma.product.findMany({
        where: {
          tenantId,
          estado: EstadoGeneral.ACTIVO,
          saleItems: { none: { sale: { estado: EstadoGeneral.ACTIVO, fecha: { gte: range.from, lte: range.to } } } },
        },
        select: {
          id: true,
          nombre: true,
          sku: true,
          stock: true,
          precio: true,
          costo: true,
        },
        orderBy: { updatedAt: 'asc' },
        take: 20,
      }),
    ]);

    return {
      range: this.serializeRange(range),
      topProducts,
      withoutMovement: slowProducts,
    };
  }

  async getInventoryReport(user: RequestUser) {
    const tenantId = this.requireTenant(user);
    const [products, lowStock, outOfStock, movements] = await Promise.all([
      this.prisma.product.aggregate({
        where: { tenantId, estado: EstadoGeneral.ACTIVO },
        _sum: { stock: true },
        _count: { _all: true },
      }),
      this.prisma.product.findMany({
        where: {
          tenantId,
          estado: EstadoGeneral.ACTIVO,
          stock: { gt: 0 },
          stockMinimo: { gt: 0 },
          AND: [{ stock: { lte: this.prisma.product.fields.stockMinimo } }],
        },
        select: { id: true, nombre: true, sku: true, stock: true, stockMinimo: true },
        orderBy: { stock: 'asc' },
        take: 30,
      }),
      this.prisma.product.findMany({
        where: { tenantId, estado: EstadoGeneral.ACTIVO, stock: { lte: 0 } },
        select: { id: true, nombre: true, sku: true, stock: true, stockMinimo: true },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
      this.prisma.inventoryMovement.findMany({
        where: { tenantId },
        include: { product: { select: { id: true, nombre: true, sku: true } } },
        orderBy: { fecha: 'desc' },
        take: 30,
      }),
    ]);

    const stockValue = await this.getInventoryValue(tenantId);

    return {
      totalProducts: products._count._all,
      totalUnits: products._sum.stock ?? 0,
      stockValue,
      lowStock,
      outOfStock,
      recentMovements: movements,
    };
  }

  async getCustomersReport(user: RequestUser, query: ReportQueryDto) {
    const tenantId = this.requireTenant(user);
    const range = this.resolveRange(query);
    const [total, newCustomers, topCustomers, recentCustomers] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({
        where: { tenantId, createdAt: { gte: range.from, lte: range.to } },
      }),
      this.getTopCustomers(tenantId, range.from, range.to),
      this.prisma.customer.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      range: this.serializeRange(range),
      total,
      newCustomers,
      topCustomers,
      recentCustomers,
    };
  }

  private async aggregateSales(tenantId: string, from: Date, to: Date) {
    const [result, refunds] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { tenantId, estado: EstadoGeneral.ACTIVO, fecha: { gte: from, lte: to } },
        _sum: { total: true, descuento: true },
        _count: { _all: true },
      }),
      this.prisma.saleRefund.aggregate({
        where: { tenantId, fecha: { gte: from, lte: to } },
        _sum: { total: true },
      }),
    ]);

    return {
      total: (result._sum.total ?? 0) - (refunds._sum.total ?? 0),
      descuento: result._sum.descuento ?? 0,
      count: result._count._all,
    };
  }

  private async getTopProducts(tenantId: string, from: Date, to: Date, take: number) {
    const grouped = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { tenantId, estado: EstadoGeneral.ACTIVO, fecha: { gte: from, lte: to } } },
      _sum: { cantidad: true, subtotal: true },
      _count: { _all: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take,
    });
    const refunded = await this.prisma.saleRefundItem.groupBy({
      by: ['productId'],
      where: { refund: { tenantId, fecha: { gte: from, lte: to } } },
      _sum: { cantidad: true, monto: true },
    });
    const refundsByProduct = new Map(refunded.map((item) => [item.productId, item]));

    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: grouped.map((item) => item.productId) } },
      select: { id: true, nombre: true, sku: true, precio: true, costo: true, stock: true },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    return grouped.map((item) => ({
      productId: item.productId,
      product: productsById.get(item.productId) ?? null,
      quantity: (item._sum.cantidad ?? 0) - (refundsByProduct.get(item.productId)?._sum.cantidad ?? 0),
      total: (item._sum.subtotal ?? 0) - (refundsByProduct.get(item.productId)?._sum.monto ?? 0),
      lines: item._count._all,
    }));
  }

  private async getTopCustomers(tenantId: string, from: Date, to: Date) {
    const grouped = await this.prisma.sale.groupBy({
      by: ['customerId'],
      where: { tenantId, estado: EstadoGeneral.ACTIVO, customerId: { not: null }, fecha: { gte: from, lte: to } },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    });

    const customerIds = grouped
      .map((item) => item.customerId)
      .filter((customerId): customerId is string => Boolean(customerId));
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, id: { in: customerIds } },
    });
    const customersById = new Map(customers.map((customer) => [customer.id, customer]));
    const refunds = await this.prisma.saleRefund.findMany({
      where: { tenantId, fecha: { gte: from, lte: to }, sale: { customerId: { not: null } } },
      select: { total: true, sale: { select: { customerId: true } } },
    });
    const refundsByCustomer = refunds.reduce((map, refund) => {
      const customerId = refund.sale.customerId;
      if (customerId) map.set(customerId, (map.get(customerId) ?? 0) + refund.total);
      return map;
    }, new Map<string, number>());

    return grouped.map((item) => ({
      customerId: item.customerId,
      customer: item.customerId ? customersById.get(item.customerId) ?? null : null,
      total: (item._sum.total ?? 0) - (item.customerId ? refundsByCustomer.get(item.customerId) ?? 0 : 0),
      purchases: item._count._all,
    }));
  }

  private async getEstimatedCost(tenantId: string, from: Date, to: Date) {
    const [items, refundItems] = await Promise.all([
      this.prisma.saleItem.findMany({
        where: { sale: { tenantId, estado: EstadoGeneral.ACTIVO, fecha: { gte: from, lte: to } } },
        select: { cantidad: true, product: { select: { costo: true } } },
      }),
      this.prisma.saleRefundItem.findMany({
        where: { refund: { tenantId, fecha: { gte: from, lte: to } } },
        select: { cantidad: true, product: { select: { costo: true } } },
      }),
    ]);

    const soldCost = items.reduce((total, item) => total + item.cantidad * item.product.costo, 0);
    const refundedCost = refundItems.reduce((total, item) => total + item.cantidad * item.product.costo, 0);
    return soldCost - refundedCost;
  }

  private async netPaymentMethods(
    tenantId: string,
    from: Date,
    to: Date,
    methods: Array<{ metodo: string; total: number; descuento: number; count: number }>,
  ) {
    const refunds = await this.prisma.saleRefund.findMany({
      where: { tenantId, fecha: { gte: from, lte: to } },
      select: { total: true, sale: { select: { metodoPago: true } } },
    });
    const refundsByMethod = refunds.reduce((map, refund) => {
      map.set(refund.sale.metodoPago, (map.get(refund.sale.metodoPago) ?? 0) + refund.total);
      return map;
    }, new Map<string, number>());

    return methods.map((method) => ({
      ...method,
      total: method.total - (refundsByMethod.get(method.metodo) ?? 0),
    }));
  }

  private async getRefundDailyRows(tenantId: string, from: Date, to: Date) {
    const refunds = await this.prisma.saleRefund.findMany({
      where: { tenantId, fecha: { gte: from, lte: to } },
      select: { fecha: true, total: true },
    });

    return refunds.map((refund) => ({
      fecha: refund.fecha,
      total: -refund.total,
      descuento: 0,
    }));
  }

  private async getExpensesTotal(tenantId: string, from: Date, to: Date) {
    const expenses = await this.prisma.expense.aggregate({
      where: { tenantId, fecha: { gte: from, lte: to } },
      _sum: { valor: true },
    });

    return expenses._sum.valor ?? 0;
  }

  private async getInventoryValue(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, estado: EstadoGeneral.ACTIVO },
      select: { stock: true, costo: true },
    });

    return products.reduce((total, product) => total + Math.max(product.stock, 0) * product.costo, 0);
  }

  private async getCashBalance(tenantId: string) {
    const movements = await this.prisma.cashMovement.groupBy({
      by: ['tipo'],
      where: { tenantId },
      _sum: { monto: true },
    });

    return movements.reduce((total, movement) => {
      const amount = movement._sum.monto ?? 0;
      if (
        movement.tipo === CashMovementType.RETIRO ||
        movement.tipo === CashMovementType.GASTO ||
        movement.tipo === CashMovementType.DEVOLUCION
      ) {
        return total - amount;
      }
      if (movement.tipo === CashMovementType.CIERRE) return total;
      return total + amount;
    }, 0);
  }

  private groupDailyTotals(rows: Array<{ fecha: Date; total: number; descuento: number }>) {
    const days = new Map<string, { date: string; total: number; descuento: number; count: number }>();

    for (const row of rows) {
      const date = row.fecha.toISOString().slice(0, 10);
      const current = days.get(date) ?? { date, total: 0, descuento: 0, count: 0 };
      current.total += row.total;
      current.descuento += row.descuento;
      current.count += 1;
      days.set(date, current);
    }

    return Array.from(days.values());
  }

  private resolveRange(query: ReportQueryDto): ReportRange {
    const to = query.to ? this.endOfDay(new Date(query.to)) : this.endOfDay(new Date());
    const from = query.from ? this.startOfDay(new Date(query.from)) : this.startOfDay(this.addDays(to, -29));
    const days = Math.max(Math.ceil((to.getTime() - from.getTime()) / 86_400_000), 1);
    const previousTo = this.addDays(from, -1);
    const previousFrom = this.addDays(previousTo, -days);
    return { from, to, previousFrom: this.startOfDay(previousFrom), previousTo: this.endOfDay(previousTo) };
  }

  private resolveTodayRange() {
    const now = new Date();
    return { from: this.startOfDay(now), to: this.endOfDay(now) };
  }

  private serializeRange(range: ReportRange) {
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      previousFrom: range.previousFrom.toISOString(),
      previousTo: range.previousTo.toISOString(),
    };
  }

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private average(total: number, count: number) {
    return count > 0 ? Math.round(total / count) : 0;
  }

  private percentChange(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 10000) / 100;
  }

  private requireTenant(user: RequestUser): string {
    if (!user.tenantId || user.rol === RoleName.SUPER_ADMIN) {
      throw new NotFoundException('Tenant no disponible para esta operacion');
    }
    return user.tenantId;
  }
}
