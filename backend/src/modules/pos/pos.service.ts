import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CashMovementType,
  CashRegisterStatus,
  EstadoGeneral,
  InventoryMovementType,
  PaymentMethod,
  Prisma,
  RoleName,
} from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';
import { RequestUser } from '../../common/types/request-user';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RefundSaleDto, VoidSaleDto } from './dto/refund-sale.dto';

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

  listSales(user: RequestUser) {
    return this.prisma.sale.findMany({
      where: { tenantId: this.requireTenant(user) },
      include: {
        customer: true,
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
      orderBy: { fecha: 'desc' },
      take: 100,
    });
  }

  async getSale(user: RequestUser, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId: this.requireTenant(user) },
      include: this.saleInclude(),
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  async createSale(user: RequestUser, dto: CreateSaleDto) {
    const tenantId = this.requireTenant(user);

    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          tenantId,
          id: { in: dto.items.map((item) => item.productId) },
          estado: 'ACTIVO',
        },
      });
      const productsById = new Map(products.map((product) => [product.id, product]));

      for (const item of dto.items) {
        const product = productsById.get(item.productId);
        if (!product) throw new NotFoundException('Producto no encontrado');
        if (product.stock < item.cantidad) {
          throw new UnprocessableEntityException(`No hay stock suficiente para ${product.nombre}`);
        }
      }

      const subtotal = dto.items.reduce((total, item) => {
        const product = productsById.get(item.productId);
        return total + (product?.precio ?? 0) * item.cantidad;
      }, 0);
      const descuento = dto.descuento ?? 0;
      if (descuento > subtotal) {
        throw new UnprocessableEntityException('El descuento no puede superar el subtotal');
      }

      const total = subtotal - descuento;
      if (dto.metodoPago === PaymentMethod.EFECTIVO && dto.montoRecibido !== undefined && dto.montoRecibido < total) {
        throw new UnprocessableEntityException('Monto recibido insuficiente');
      }

      const customerId = await this.resolveCustomer(tx, tenantId, dto);
      const cashRegister = await this.findOrOpenCashRegister(tx, tenantId, user.id);

      const sale = await tx.sale.create({
        data: {
          tenantId,
          customerId,
          usuarioId: user.id,
          subtotal,
          descuento,
          impuestos: 0,
          total,
          metodoPago: dto.metodoPago,
          estado: EstadoGeneral.ACTIVO,
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
          payments: {
            create: {
              tenantId,
              metodo: dto.metodoPago,
              monto: total,
              referenciaExterna: dto.referenciaExterna,
            },
          },
        },
        include: this.saleInclude(),
      });

      for (const item of dto.items) {
        const product = productsById.get(item.productId);
        if (!product) continue;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.cantidad } },
        });

        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            tipo: InventoryMovementType.SALIDA,
            cantidad: item.cantidad,
            stockAnterior: product.stock,
            stockNuevo: product.stock - item.cantidad,
            observacion: `Venta POS ${sale.id}`,
            usuarioId: user.id,
          },
        });
      }

      await tx.cashMovement.create({
        data: {
          tenantId,
          cashRegisterId: cashRegister.id,
          tipo: CashMovementType.VENTA,
          monto: total,
          descripcion: `Venta POS ${sale.id.slice(0, 8).toUpperCase()}`,
          referenciaId: sale.id,
          referenciaTipo: 'SALE',
          usuarioId: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: user.id,
          accion: 'SALE_CREATED',
          entidad: 'sales',
          entidadId: sale.id,
          oldValue: Prisma.JsonNull,
          newValue: sale,
          metadata: customerId ? { customerId } : Prisma.JsonNull,
        },
      });

      return {
        ...sale,
        cambio: dto.metodoPago === PaymentMethod.EFECTIVO ? Math.max((dto.montoRecibido ?? total) - total, 0) : 0,
      };
    });
  }

  async voidSale(user: RequestUser, id: string, dto: VoidSaleDto) {
    const tenantId = this.requireTenant(user);

    return this.prisma.$transaction(async (tx) => {
      const sale = await this.findRefundableSale(tx, tenantId, id);
      const remaining = await this.getRemainingRefundQuantities(tx, sale.id);
      const items = sale.items
        .map((item) => ({
          saleItem: item,
          cantidad: remaining.get(item.id) ?? 0,
        }))
        .filter((item) => item.cantidad > 0);

      if (items.length > 0) {
        await this.createRefundFromSaleItems(tx, tenantId, user.id, sale, items, dto.motivo ?? 'Anulacion total de venta');
      }

      const cancelled = await tx.sale.update({
        where: { id: sale.id },
        data: { estado: EstadoGeneral.CANCELADO },
        include: this.saleInclude(),
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: user.id,
          accion: 'SALE_VOIDED',
          entidad: 'sales',
          entidadId: sale.id,
          oldValue: sale,
          newValue: cancelled,
          metadata: { motivo: dto.motivo ?? null },
        },
      });

      return cancelled;
    });
  }

  async refundSale(user: RequestUser, id: string, dto: RefundSaleDto) {
    const tenantId = this.requireTenant(user);

    return this.prisma.$transaction(async (tx) => {
      const sale = await this.findRefundableSale(tx, tenantId, id);
      const remaining = await this.getRemainingRefundQuantities(tx, sale.id);
      const saleItemsById = new Map(sale.items.map((item) => [item.id, item]));
      const seen = new Set<string>();
      const items = dto.items.map((item) => {
        if (seen.has(item.saleItemId)) throw new BadRequestException('No repitas el mismo item en la devolucion');
        seen.add(item.saleItemId);

        const saleItem = saleItemsById.get(item.saleItemId);
        if (!saleItem) throw new NotFoundException('Item de venta no encontrado');
        const available = remaining.get(item.saleItemId) ?? 0;
        if (item.cantidad > available) {
          throw new UnprocessableEntityException(`La cantidad a devolver supera lo disponible para ${saleItem.product.nombre}`);
        }
        return { saleItem, cantidad: item.cantidad };
      });

      const refund = await this.createRefundFromSaleItems(tx, tenantId, user.id, sale, items, dto.motivo);
      const updatedRemaining = await this.getRemainingRefundQuantities(tx, sale.id);
      const allReturned = sale.items.every((item) => (updatedRemaining.get(item.id) ?? 0) === 0);
      if (allReturned) {
        await tx.sale.update({
          where: { id: sale.id },
          data: { estado: EstadoGeneral.CANCELADO },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: user.id,
          accion: 'SALE_REFUNDED',
          entidad: 'sale_refunds',
          entidadId: refund.id,
          oldValue: sale,
          newValue: refund,
        },
      });

      return refund;
    });
  }

  private async resolveCustomer(tx: Prisma.TransactionClient, tenantId: string, dto: CreateSaleDto) {
    if (dto.customerId && dto.customer) {
      throw new BadRequestException('Usa customerId o customer, no ambos');
    }

    if (dto.customerId) {
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, tenantId },
        select: { id: true },
      });
      if (!customer) throw new NotFoundException('Cliente no encontrado');
      return customer.id;
    }

    if (!dto.customer) return undefined;

    const telefono = this.normalizePhone(dto.customer.telefono);
    if (!telefono) throw new BadRequestException('Telefono de cliente invalido');

    const customer = await tx.customer.upsert({
      where: {
        tenantId_telefono: {
          tenantId,
          telefono,
        },
      },
      update: {
        nombre: dto.customer.nombre,
        email: dto.customer.email,
        direccion: dto.customer.direccion,
      },
      create: {
        tenantId,
        nombre: dto.customer.nombre,
        telefono,
        email: dto.customer.email,
        direccion: dto.customer.direccion,
      },
      select: { id: true },
    });

    return customer.id;
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
        descripcion: 'Apertura automatica POS MVP',
        usuarioId: userId,
      },
    });

    return cashRegister;
  }

  private async findRefundableSale(tx: Prisma.TransactionClient, tenantId: string, id: string) {
    const sale = await tx.sale.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                nombre: true,
                sku: true,
                stock: true,
              },
            },
          },
        },
        payments: true,
        refunds: { include: { items: true } },
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.estado === EstadoGeneral.CANCELADO) throw new ConflictException('La venta ya esta anulada');
    return sale;
  }

  private async getRemainingRefundQuantities(tx: Prisma.TransactionClient, saleId: string) {
    const saleItems = await tx.saleItem.findMany({
      where: { saleId },
      select: {
        id: true,
        cantidad: true,
        refundItems: { select: { cantidad: true } },
      },
    });

    return new Map(
      saleItems.map((item) => [
        item.id,
        item.cantidad - item.refundItems.reduce((sum, refundItem) => sum + refundItem.cantidad, 0),
      ]),
    );
  }

  private async createRefundFromSaleItems(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    sale: { id: string; total: number; metodoPago: PaymentMethod },
    items: Array<{
      cantidad: number;
      saleItem: {
        id: string;
        productId: string;
        precioUnitario: number;
        product: { id: string; nombre: string; stock: number };
      };
    }>,
    motivo: string,
  ) {
    const total = items.reduce((sum, item) => sum + item.cantidad * item.saleItem.precioUnitario, 0);
    if (total <= 0) throw new BadRequestException('La devolucion no tiene valor');

    const refund = await tx.saleRefund.create({
      data: {
        tenantId,
        saleId: sale.id,
        usuarioId: userId,
        total,
        motivo,
        items: {
          create: items.map((item) => ({
            saleItemId: item.saleItem.id,
            productId: item.saleItem.productId,
            cantidad: item.cantidad,
            monto: item.cantidad * item.saleItem.precioUnitario,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, nombre: true, sku: true } } } },
      },
    });

    for (const item of items) {
      const stockNuevo = item.saleItem.product.stock + item.cantidad;
      await tx.product.update({
        where: { id: item.saleItem.productId },
        data: { stock: stockNuevo },
      });
      await tx.inventoryMovement.create({
        data: {
          tenantId,
          productId: item.saleItem.productId,
          tipo: InventoryMovementType.DEVOLUCION,
          cantidad: item.cantidad,
          stockAnterior: item.saleItem.product.stock,
          stockNuevo,
          observacion: `Devolucion POS ${sale.id}`,
          usuarioId: userId,
        },
      });
    }

    const cashRegister = await this.findOrOpenCashRegister(tx, tenantId, userId);
    await tx.cashMovement.create({
      data: {
        tenantId,
        cashRegisterId: cashRegister.id,
        tipo: CashMovementType.DEVOLUCION,
        monto: total,
        descripcion: `Devolucion venta ${sale.id.slice(0, 8).toUpperCase()}`,
        referenciaId: refund.id,
        referenciaTipo: 'SALE_REFUND',
        usuarioId: userId,
      },
    });

    return refund;
  }

  private requireTenant(user: RequestUser): string {
    if (!user.tenantId || user.rol === RoleName.SUPER_ADMIN) {
      throw new NotFoundException('Tenant no disponible para esta operacion');
    }
    return user.tenantId;
  }

  private normalizePhone(value: string) {
    return value.replace(/[^0-9]/g, '');
  }

  private saleInclude() {
    return {
      customer: true,
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
      refunds: {
        include: {
          items: true,
        },
        orderBy: { fecha: 'desc' as const },
      },
    };
  }
}
