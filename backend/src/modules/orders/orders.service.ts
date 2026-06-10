import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CashMovementType,
  CashRegisterStatus,
  EstadoGeneral,
  InventoryMovementType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  RoleName,
  StockReservationStatus,
} from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';
import { RequestUser } from '../../common/types/request-user';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { DeliverOrderDto } from './dto/deliver-order.dto';

const RESERVATION_TTL_MINUTES = 30;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createPublicOrder(dto: CreateOrderDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: dto.tenantSlug, estado: EstadoGeneral.ACTIVO },
      include: { deliveryConfig: true },
    });
    if (!tenant) throw new NotFoundException('Comercio no encontrado');

    this.validateCoverage(dto, tenant);

    return this.prisma.$transaction(async (tx) => {
      const productIds = dto.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: {
          tenantId: tenant.id,
          id: { in: productIds },
          estado: EstadoGeneral.ACTIVO,
        },
      });
      const productsById = new Map(products.map((product) => [product.id, product]));

      for (const item of dto.items) {
        const product = productsById.get(item.productId);
        if (!product) {
          throw new NotFoundException('Producto no encontrado en este comercio');
        }
        if (item.variantId) {
          throw new UnprocessableEntityException('Pedidos con variantes todavia no estan disponibles');
        }
        if (product.stock < item.cantidad) {
          throw new UnprocessableEntityException(`No hay stock suficiente para ${product.nombre}`);
        }
      }

      const customer = await tx.customer.upsert({
        where: {
          tenantId_telefono: {
            tenantId: tenant.id,
            telefono: dto.customerPhone,
          },
        },
        update: {
          nombre: dto.customerName,
          email: dto.customerEmail,
          direccion: dto.direccion,
          latitud: dto.latitud,
          longitud: dto.longitud,
        },
        create: {
          tenantId: tenant.id,
          nombre: dto.customerName,
          telefono: dto.customerPhone,
          email: dto.customerEmail,
          direccion: dto.direccion,
          latitud: dto.latitud,
          longitud: dto.longitud,
        },
      });

      const subtotal = dto.items.reduce((total, item) => {
        const product = productsById.get(item.productId);
        return total + (product?.precio ?? 0) * item.cantidad;
      }, 0);
      const costoDomicilio = tenant.deliveryConfig?.activo ? tenant.deliveryConfig.costoBase : 0;

      const order = await tx.order.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          subtotal,
          costoDomicilio,
          total: subtotal + costoDomicilio,
          metodoPago: dto.metodoPago ?? PaymentMethod.CONTRA_ENTREGA,
          direccion: dto.direccion,
          latitud: dto.latitud,
          longitud: dto.longitud,
          observaciones: dto.observaciones,
          items: {
            create: dto.items.map((item) => {
              const product = productsById.get(item.productId);
              const precioUnitario = product?.precio ?? 0;
              return {
                productId: item.productId,
                cantidad: item.cantidad,
                precioUnitario,
                subtotal: precioUnitario * item.cantidad,
              };
            }),
          },
        },
        include: this.orderInclude(),
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          accion: 'ORDER_CREATED',
          entidad: 'orders',
          entidadId: order.id,
          oldValue: Prisma.JsonNull,
          newValue: order,
          metadata: { source: 'public_catalog' },
        },
      });

      return order;
    });
  }

  listOrders(user: RequestUser) {
    return this.prisma.order.findMany({
      where: { tenantId: this.requireTenant(user) },
      include: this.orderInclude(),
      orderBy: { fecha: 'desc' },
      take: 100,
    });
  }

  async getOrder(user: RequestUser, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId: this.requireTenant(user) },
      include: this.orderInclude(),
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  listDeliveryUsers(user: RequestUser) {
    return this.prisma.user.findMany({
      where: {
        tenantId: this.requireTenant(user),
        rol: RoleName.DOMICILIARIO,
        estado: EstadoGeneral.ACTIVO,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  confirmOrder(user: RequestUser, id: string) {
    return this.transitionOrder(user, id, OrderStatus.CONFIRMADO);
  }

  markPreparing(user: RequestUser, id: string) {
    return this.transitionOrder(user, id, OrderStatus.PREPARANDO);
  }

  markReady(user: RequestUser, id: string) {
    return this.transitionOrder(user, id, OrderStatus.LISTO_PARA_ENTREGA);
  }

  dispatchOrder(user: RequestUser, id: string) {
    return this.transitionOrder(user, id, OrderStatus.EN_CAMINO);
  }

  deliverOrder(user: RequestUser, id: string, dto: DeliverOrderDto) {
    return this.transitionOrder(user, id, OrderStatus.ENTREGADO, dto.motivo, dto);
  }

  cancelOrder(user: RequestUser, id: string, motivo?: string) {
    return this.transitionOrder(user, id, OrderStatus.CANCELADO, motivo);
  }

  rejectOrder(user: RequestUser, id: string, motivo?: string) {
    return this.transitionOrder(user, id, OrderStatus.CANCELADO, motivo ?? 'Pedido rechazado');
  }

  async assignDelivery(user: RequestUser, id: string, dto: AssignDeliveryDto) {
    const tenantId = this.requireTenant(user);

    return this.prisma.$transaction(async (tx) => {
      const [order, deliveryUser] = await Promise.all([
        tx.order.findFirst({ where: { id, tenantId } }),
        tx.user.findFirst({
          where: {
            id: dto.deliveryUserId,
            tenantId,
            rol: RoleName.DOMICILIARIO,
            estado: EstadoGeneral.ACTIVO,
          },
        }),
      ]);

      if (!order) throw new NotFoundException('Pedido no encontrado');
      if (!deliveryUser) throw new NotFoundException('Domiciliario no encontrado');
      if (
        order.estado === OrderStatus.PENDIENTE ||
        order.estado === OrderStatus.CANCELADO ||
        order.estado === OrderStatus.ENTREGADO
      ) {
        throw new ConflictException('El pedido no esta en estado asignable');
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          deliveryUserId: deliveryUser.id,
          deliveryAssignedAt: new Date(),
        },
        include: this.orderInclude(),
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: user.id,
          accion: 'ORDER_DELIVERY_ASSIGNED',
          entidad: 'orders',
          entidadId: order.id,
          oldValue: order,
          newValue: updated,
          metadata: { deliveryUserId: deliveryUser.id },
        },
      });

      return updated;
    });
  }

  async getDeliveryRoute(user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no encontrado');

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: user.tenantId },
      select: { nombre: true, direccion: true, latitud: true, longitud: true },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const where: any = {
      tenantId: user.tenantId,
      estado: { in: [OrderStatus.EN_CAMINO, OrderStatus.LISTO_PARA_ENTREGA] },
    };

    if (user.rol === RoleName.DOMICILIARIO) {
      where.deliveryUserId = user.id;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { nombre: true, telefono: true, direccion: true } },
        deliveryUser: { select: { id: true, nombre: true } },
        items: { include: { product: { select: { nombre: true } } } },
      },
      orderBy: { fecha: 'asc' },
    });

    const sorted: any[] = [];
    const remaining = [...orders];
    let currentLat = tenant.latitud ?? 1.149;
    let currentLng = tenant.longitud ?? -76.647;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      remaining.forEach((o, i) => {
        if (o.latitud && o.longitud) {
          const dist = this.haversineKm(
            { latitud: currentLat, longitud: currentLng },
            { latitud: o.latitud, longitud: o.longitud },
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }
      });

      const order = remaining.splice(nearestIdx, 1)[0];
      currentLat = order.latitud ?? currentLat;
      currentLng = order.longitud ?? currentLng;
      sorted.push({ ...order, distanciaKm: Math.round(nearestDist * 100) / 100 });
    }

    return {
      business: tenant,
      orders: sorted,
      totalOrders: sorted.length,
      totalDistancia: Math.round(sorted.reduce((s, o) => s + (o.distanciaKm ?? 0), 0) * 100) / 100,
    };
  }

  private async transitionOrder(
    user: RequestUser,
    id: string,
    nextStatus: OrderStatus,
    motivo?: string,
    deliverDto?: DeliverOrderDto,
  ) {
    const tenantId = this.requireTenant(user);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, tenantId },
        include: { items: { include: { product: true } }, stockReservations: true },
      });
      if (!order) throw new NotFoundException('Pedido no encontrado');

      this.assertTransition(order.estado, nextStatus);
      this.assertDeliveryOwnership(user, order.deliveryUserId, nextStatus);

      if (nextStatus === OrderStatus.CONFIRMADO) {
        await this.reserveStock(tx, tenantId, order.id, order.items);
      }

      if (nextStatus === OrderStatus.CANCELADO) {
        await tx.stockReservation.updateMany({
          where: { tenantId, orderId: order.id, estado: StockReservationStatus.ACTIVA },
          data: { estado: StockReservationStatus.LIBERADA },
        });
      }

      if (nextStatus === OrderStatus.ENTREGADO) {
        await this.consumeStock(tx, tenantId, order.id, order.items, user.id);
        await this.registerOrderPayment(tx, tenantId, user.id, order, deliverDto);
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          estado: nextStatus,
          ...(nextStatus === OrderStatus.ENTREGADO
            ? {
                deliveredAt: new Date(),
                metodoPago: deliverDto?.metodoPago ?? order.metodoPago,
              }
            : {}),
        },
        include: this.orderInclude(),
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: user.id,
          accion: `ORDER_${nextStatus}`,
          entidad: 'orders',
          entidadId: order.id,
          oldValue: order,
          newValue: updated,
          metadata: motivo ? { motivo } : Prisma.JsonNull,
        },
      });

      return updated;
    });
  }

  private async reserveStock(
    tx: Prisma.TransactionClient,
    tenantId: string,
    orderId: string,
    items: Array<{ productId: string; cantidad: number; product: { nombre: string; stock: number } }>,
  ) {
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

    for (const item of items) {
      const activeReservations = await tx.stockReservation.aggregate({
        where: {
          tenantId,
          productId: item.productId,
          estado: StockReservationStatus.ACTIVA,
          fechaExpiracion: { gt: new Date() },
        },
        _sum: { cantidad: true },
      });
      const available = item.product.stock - (activeReservations._sum.cantidad ?? 0);
      if (available < item.cantidad) {
        throw new UnprocessableEntityException(`No hay stock suficiente para ${item.product.nombre}`);
      }

      await tx.stockReservation.create({
        data: {
          tenantId,
          productId: item.productId,
          orderId,
          cantidad: item.cantidad,
          fechaExpiracion: expiresAt,
        },
      });
    }
  }

  private async consumeStock(
    tx: Prisma.TransactionClient,
    tenantId: string,
    orderId: string,
    items: Array<{ productId: string; cantidad: number; product: { nombre: string; stock: number } }>,
    userId: string,
  ) {
    for (const item of items) {
      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          tenantId,
          stock: { gte: item.cantidad },
        },
        data: { stock: { decrement: item.cantidad } },
      });
      if (updated.count !== 1) {
        throw new UnprocessableEntityException(`No hay stock suficiente para ${item.product.nombre}`);
      }

      await tx.inventoryMovement.create({
        data: {
          tenantId,
          productId: item.productId,
          tipo: InventoryMovementType.SALIDA,
          cantidad: item.cantidad,
          stockAnterior: item.product.stock,
          stockNuevo: item.product.stock - item.cantidad,
          observacion: `Pedido entregado ${orderId}`,
          usuarioId: userId,
        },
      });
    }

    await tx.stockReservation.updateMany({
      where: { tenantId, orderId, estado: StockReservationStatus.ACTIVA },
      data: { estado: StockReservationStatus.CONSUMIDA },
    });
  }

  private assertDeliveryOwnership(user: RequestUser, deliveryUserId: string | null, nextStatus: OrderStatus) {
    if (
      user.rol === RoleName.DOMICILIARIO &&
      (nextStatus === OrderStatus.EN_CAMINO || nextStatus === OrderStatus.ENTREGADO) &&
      deliveryUserId &&
      deliveryUserId !== user.id
    ) {
      throw new ForbiddenException('Este pedido esta asignado a otro domiciliario');
    }
  }

  private async registerOrderPayment(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    order: { id: string; total: number; metodoPago: PaymentMethod },
    dto?: DeliverOrderDto,
  ) {
    const metodoPago = dto?.metodoPago ?? order.metodoPago ?? PaymentMethod.CONTRA_ENTREGA;
    if (metodoPago === PaymentMethod.MIXTO) {
      throw new BadRequestException('Pago mixto no esta habilitado para pedidos en MVP');
    }

    const montoRecibido = dto?.montoRecibido ?? order.total;
    if (montoRecibido < order.total) {
      throw new UnprocessableEntityException('Monto recibido insuficiente para entregar el pedido');
    }

    const existingPayment = await tx.payment.findFirst({
      where: {
        tenantId,
        tipo: 'ORDER',
        referenciaId: order.id,
        estado: PaymentStatus.COMPLETADO,
      },
    });
    if (existingPayment) {
      throw new ConflictException('El pedido ya tiene un pago completado');
    }

    const cambio = metodoPago === PaymentMethod.EFECTIVO || metodoPago === PaymentMethod.CONTRA_ENTREGA
      ? montoRecibido - order.total
      : 0;

    const notes = [
      dto?.referenciaExterna ? `Referencia ${dto.referenciaExterna}` : null,
      `Monto recibido ${montoRecibido}`,
      cambio > 0 ? `Cambio ${cambio}` : null,
    ].filter(Boolean).join(' | ');

    await tx.payment.create({
      data: {
        tenantId,
        tipo: 'ORDER',
        referenciaId: order.id,
        metodo: metodoPago,
        monto: order.total,
        estado: PaymentStatus.COMPLETADO,
        observaciones: notes,
        usuarioId: userId,
        fechaPago: new Date(),
      },
    });

    const cashRegister = await this.findOrOpenCashRegister(tx, tenantId, userId);
    await tx.cashMovement.create({
      data: {
        tenantId,
        cashRegisterId: cashRegister.id,
        tipo: CashMovementType.VENTA,
        monto: order.total,
        descripcion: `Pedido entregado ${order.id}`,
        referenciaId: order.id,
        referenciaTipo: 'ORDER',
        usuarioId: userId,
      },
    });
  }

  private async findOrOpenCashRegister(tx: Prisma.TransactionClient, tenantId: string, userId: string) {
    const existing = await tx.cashRegister.findFirst({
      where: { tenantId, usuarioId: userId, estado: CashRegisterStatus.ABIERTA },
      orderBy: { fechaApertura: 'desc' },
    });
    if (existing) return existing;

    const cashRegister = await tx.cashRegister.create({
      data: {
        tenantId,
        usuarioId: userId,
        fechaApertura: new Date(),
        saldoInicial: 0,
        estado: CashRegisterStatus.ABIERTA,
      },
    });

    await tx.cashMovement.create({
      data: {
        tenantId,
        cashRegisterId: cashRegister.id,
        tipo: CashMovementType.APERTURA,
        monto: 0,
        descripcion: 'Apertura automatica por entrega de pedido MVP',
        usuarioId: userId,
      },
    });

    return cashRegister;
  }

  private assertTransition(current: OrderStatus, next: OrderStatus): void {
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDIENTE]: [OrderStatus.CONFIRMADO, OrderStatus.CANCELADO],
      [OrderStatus.CONFIRMADO]: [OrderStatus.PREPARANDO, OrderStatus.CANCELADO],
      [OrderStatus.PREPARANDO]: [OrderStatus.LISTO_PARA_ENTREGA, OrderStatus.CANCELADO],
      [OrderStatus.LISTO_PARA_ENTREGA]: [OrderStatus.EN_CAMINO, OrderStatus.CANCELADO],
      [OrderStatus.EN_CAMINO]: [OrderStatus.ENTREGADO, OrderStatus.CANCELADO],
      [OrderStatus.ENTREGADO]: [],
      [OrderStatus.CANCELADO]: [],
    };

    if (!allowed[current].includes(next)) {
      throw new ConflictException(`Transicion invalida de ${current} a ${next}`);
    }
  }

  private validateCoverage(
    dto: CreateOrderDto,
    tenant: {
      latitud: number | null;
      longitud: number | null;
      deliveryConfig: { activo: boolean; radioKm: number } | null;
    },
  ): void {
    if (!tenant.deliveryConfig?.activo || !dto.latitud || !dto.longitud || !tenant.latitud || !tenant.longitud) {
      return;
    }

    const distance = this.haversineKm(
      { latitud: tenant.latitud, longitud: tenant.longitud },
      { latitud: dto.latitud, longitud: dto.longitud },
    );
    if (distance > tenant.deliveryConfig.radioKm) {
      throw new UnprocessableEntityException('Direccion fuera de cobertura del comercio');
    }
  }

  private haversineKm(
    a: { latitud: number; longitud: number },
    b: { latitud: number; longitud: number },
  ): number {
    const radiusKm = 6371;
    const dLat = this.degreesToRadians(b.latitud - a.latitud);
    const dLon = this.degreesToRadians(b.longitud - a.longitud);
    const lat1 = this.degreesToRadians(a.latitud);
    const lat2 = this.degreesToRadians(b.latitud);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return radiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  private degreesToRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private requireTenant(user: RequestUser): string {
    if (!user.tenantId || user.rol === RoleName.SUPER_ADMIN) {
      throw new NotFoundException('Tenant no disponible para esta operacion');
    }
    return user.tenantId;
  }

  private orderInclude() {
    return {
      customer: true,
      deliveryUser: {
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
        },
      },
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
      stockReservations: true,
    };
  }
}
