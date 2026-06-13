import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EstadoGeneral, InventoryMovementType, Prisma, PurchasePaymentStatus, RoleName } from '../../../database/prisma-client';
import { PrismaService } from '../../../database/prisma.service';
import { RequestUser } from '../../../common/types/request-user';
import { CreatePurchaseDto, PurchaseQueryDto, UpdatePurchaseInvoiceDto } from '../dto/purchase.dto';
import { CreateSupplierDto, SupplierQueryDto, UpdateSupplierDto } from '../dto/supplier.dto';

@Injectable()
export class ProcurementService {
  private readonly purchaseInclude = {
    supplier: true,
    items: { include: { product: { select: { id: true, nombre: true, sku: true, stock: true, costo: true } } } },
  } satisfies Prisma.PurchaseInclude;

  constructor(private readonly prisma: PrismaService) {}

  listSuppliers(user: RequestUser, query: SupplierQueryDto) {
    const tenantId = this.requireTenant(user);
    return this.prisma.supplier.findMany({
      where: {
        tenantId,
        estado: EstadoGeneral.ACTIVO,
        ...(query.q
          ? {
              OR: [
                { nombre: { contains: query.q, mode: 'insensitive' } },
                { telefono: { contains: query.q, mode: 'insensitive' } },
                { email: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { nombre: 'asc' },
      take: 100,
    });
  }

  async getSupplier(user: RequestUser, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId: this.requireTenant(user), estado: EstadoGeneral.ACTIVO },
      include: { products: { include: { product: true } }, purchases: { orderBy: { fechaCompra: 'desc' }, take: 20 } },
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return supplier;
  }

  async createSupplier(user: RequestUser, dto: CreateSupplierDto) {
    const tenantId = this.requireTenant(user);
    await this.ensureUniqueSupplierName(tenantId, dto.nombre);

    const supplier = await this.prisma.supplier.create({
      data: {
        tenantId,
        nombre: dto.nombre.trim(),
        telefono: this.optionalString(dto.telefono),
        email: this.optionalString(dto.email),
        direccion: this.optionalString(dto.direccion),
        observaciones: this.optionalString(dto.observaciones),
      },
    });

    await this.audit(tenantId, user.id, 'SUPPLIER_CREATED', 'suppliers', supplier.id, null, supplier);
    return supplier;
  }

  async updateSupplier(user: RequestUser, id: string, dto: UpdateSupplierDto) {
    const tenantId = this.requireTenant(user);
    const current = await this.prisma.supplier.findFirst({ where: { id, tenantId, estado: EstadoGeneral.ACTIVO } });
    if (!current) throw new NotFoundException('Proveedor no encontrado');
    if (dto.nombre && dto.nombre.trim() !== current.nombre) {
      await this.ensureUniqueSupplierName(tenantId, dto.nombre, id);
    }

    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        telefono: this.optionalString(dto.telefono),
        email: this.optionalString(dto.email),
        direccion: this.optionalString(dto.direccion),
        observaciones: this.optionalString(dto.observaciones),
      },
    });

    await this.audit(tenantId, user.id, 'SUPPLIER_UPDATED', 'suppliers', supplier.id, current, supplier);
    return supplier;
  }

  async deleteSupplier(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    const current = await this.prisma.supplier.findFirst({ where: { id, tenantId, estado: EstadoGeneral.ACTIVO } });
    if (!current) throw new NotFoundException('Proveedor no encontrado');

    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: { estado: EstadoGeneral.INACTIVO },
    });

    await this.audit(tenantId, user.id, 'SUPPLIER_DISABLED', 'suppliers', supplier.id, current, supplier);
    return supplier;
  }

  listPurchases(user: RequestUser, query: PurchaseQueryDto) {
    const tenantId = this.requireTenant(user);
    const range = this.purchaseRange(query);
    const and = this.purchaseAndFilters(query);

    return this.prisma.purchase.findMany({
      where: {
        tenantId,
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        ...(query.estadoPago ? { estadoPago: query.estadoPago } : {}),
        ...(range ? { fechaCompra: range } : {}),
        ...(and.length > 0 ? { AND: and } : {}),
      },
      include: this.purchaseInclude,
      orderBy: { fechaCompra: 'desc' },
      take: 100,
    });
  }

  async getPurchase(user: RequestUser, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId: this.requireTenant(user) },
      include: this.purchaseInclude,
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    return purchase;
  }

  async createPurchase(user: RequestUser, dto: CreatePurchaseDto) {
    const tenantId = this.requireTenant(user);
    if (dto.supplierId) await this.ensureActiveSupplier(tenantId, dto.supplierId);
    this.ensureUniqueItems(dto);

    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: productIds }, estado: EstadoGeneral.ACTIVO },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Uno o mas productos no existen en este tenant');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const total = dto.items.reduce((sum, item) => sum + item.cantidad * item.costoUnitario, 0);
    const fechaCompra = dto.fechaCompra ? new Date(dto.fechaCompra) : new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          tenantId,
          supplierId: dto.supplierId,
          numeroFactura: this.optionalString(dto.numeroFactura),
          total,
          fechaCompra,
          fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : undefined,
          estadoPago: dto.estadoPago ?? PurchasePaymentStatus.PENDIENTE,
          facturaUrl: this.optionalString(dto.facturaUrl),
          facturaKey: this.optionalString(dto.facturaKey),
          facturaNombre: this.optionalString(dto.facturaNombre),
          facturaMime: this.optionalString(dto.facturaMime),
          facturaOcrTexto: this.optionalString(dto.facturaOcrTexto),
          facturaOcrJson: dto.facturaOcrJson === undefined ? undefined : (dto.facturaOcrJson as Prisma.InputJsonValue),
          observaciones: this.optionalString(dto.observaciones),
          estado: EstadoGeneral.ACTIVO,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              cantidad: item.cantidad,
              costoUnitario: item.costoUnitario,
              subtotal: item.cantidad * item.costoUnitario,
            })),
          },
        },
        include: this.purchaseInclude,
      });

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (!product) throw new NotFoundException('Producto no encontrado');
        const stockNuevo = product.stock + item.cantidad;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: stockNuevo, costo: item.costoUnitario },
        });

        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            tipo: InventoryMovementType.ENTRADA,
            cantidad: item.cantidad,
            stockAnterior: product.stock,
            stockNuevo,
            observacion: `Compra ${purchase.numeroFactura ?? purchase.id}`,
            usuarioId: user.id,
          },
        });

        if (dto.supplierId) {
          await tx.productSupplier.updateMany({
            where: { tenantId, productId: item.productId, esPrincipal: true },
            data: { esPrincipal: false },
          });
          await tx.productSupplier.upsert({
            where: {
              tenantId_productId_supplierId: {
                tenantId,
                productId: item.productId,
                supplierId: dto.supplierId,
              },
            },
            create: {
              tenantId,
              productId: item.productId,
              supplierId: dto.supplierId,
              costo: item.costoUnitario,
              esPrincipal: true,
            },
            update: { costo: item.costoUnitario, esPrincipal: true },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: user.id,
          accion: 'PURCHASE_CREATED',
          entidad: 'purchases',
          entidadId: purchase.id,
          oldValue: Prisma.JsonNull,
          newValue: purchase,
        },
      });

      return purchase;
    });

    return this.getPurchase(user, created.id);
  }

  async cancelPurchase(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);

    const cancelled = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id, tenantId },
        include: this.purchaseInclude,
      });
      if (!purchase) throw new NotFoundException('Compra no encontrada');
      if (purchase.estado === EstadoGeneral.CANCELADO) {
        throw new ConflictException('La compra ya esta anulada');
      }

      for (const item of purchase.items) {
        const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
        if (!product) throw new NotFoundException(`Producto no encontrado para item ${item.id}`);
        if (product.stock < item.cantidad) {
          throw new UnprocessableEntityException(`No se puede anular: ${product.nombre} quedaria con stock negativo`);
        }

        const stockNuevo = product.stock - item.cantidad;
        await tx.product.update({
          where: { id: product.id },
          data: { stock: stockNuevo },
        });

        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: product.id,
            tipo: InventoryMovementType.SALIDA,
            cantidad: item.cantidad,
            stockAnterior: product.stock,
            stockNuevo,
            observacion: `Anulacion compra ${purchase.numeroFactura ?? purchase.id}`,
            usuarioId: user.id,
          },
        });
      }

      const updated = await tx.purchase.update({
        where: { id: purchase.id },
        data: { estado: EstadoGeneral.CANCELADO },
        include: this.purchaseInclude,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: user.id,
          accion: 'PURCHASE_CANCELLED',
          entidad: 'purchases',
          entidadId: purchase.id,
          oldValue: purchase,
          newValue: updated,
        },
      });

      return updated;
    });

    return cancelled;
  }

  async updatePurchaseInvoice(user: RequestUser, id: string, dto: UpdatePurchaseInvoiceDto) {
    const tenantId = this.requireTenant(user);
    const current = await this.prisma.purchase.findFirst({
      where: { id, tenantId },
      include: this.purchaseInclude,
    });
    if (!current) throw new NotFoundException('Compra no encontrada');

    const updated = await this.prisma.purchase.update({
      where: { id },
      data: {
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : undefined,
        estadoPago: dto.estadoPago,
        facturaUrl: this.optionalString(dto.facturaUrl),
        facturaKey: this.optionalString(dto.facturaKey),
        facturaNombre: this.optionalString(dto.facturaNombre),
        facturaMime: this.optionalString(dto.facturaMime),
        facturaOcrTexto: this.optionalString(dto.facturaOcrTexto),
        facturaOcrJson: dto.facturaOcrJson === undefined ? undefined : (dto.facturaOcrJson as Prisma.InputJsonValue),
      },
      include: this.purchaseInclude,
    });

    await this.audit(tenantId, user.id, 'PURCHASE_INVOICE_UPDATED', 'purchases', id, current, updated);
    return updated;
  }

  private ensureUniqueItems(dto: CreatePurchaseDto) {
    const productIds = new Set<string>();
    for (const item of dto.items) {
      if (productIds.has(item.productId)) {
        throw new BadRequestException('No repitas el mismo producto en una compra');
      }
      productIds.add(item.productId);
    }
  }

  private async ensureActiveSupplier(tenantId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId, estado: EstadoGeneral.ACTIVO },
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
  }

  private async ensureUniqueSupplierName(tenantId: string, nombre: string, excludeId?: string) {
    const existing = await this.prisma.supplier.findFirst({
      where: {
        tenantId,
        nombre: { equals: nombre.trim(), mode: 'insensitive' },
        estado: EstadoGeneral.ACTIVO,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) throw new ConflictException('Ya existe un proveedor con este nombre');
  }

  private purchaseRange(query: PurchaseQueryDto) {
    if (!query.from && !query.to) return undefined;
    return {
      ...(query.from ? { gte: this.startOfDay(new Date(query.from)) } : {}),
      ...(query.to ? { lte: this.endOfDay(new Date(query.to)) } : {}),
    };
  }

  private purchaseAndFilters(query: PurchaseQueryDto): Prisma.PurchaseWhereInput[] {
    if (!query.due) return [];

    const today = this.startOfDay(new Date());
    const in7 = this.endOfDay(this.addDays(today, 7));
    const in30 = this.endOfDay(this.addDays(today, 30));
    const unpaid: Prisma.PurchaseWhereInput = { estadoPago: { not: PurchasePaymentStatus.PAGADA } };

    if (query.due === 'withoutDue') return [{ fechaVencimiento: null }];
    if (query.due === 'overdue') return [unpaid, { fechaVencimiento: { lt: today } }];
    if (query.due === 'next7') return [unpaid, { fechaVencimiento: { gte: today, lte: in7 } }];
    return [unpaid, { fechaVencimiento: { gte: today, lte: in30 } }];
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private optionalString(value?: string) {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private audit(
    tenantId: string,
    userId: string,
    accion: string,
    entidad: string,
    entidadId: string,
    oldValue: Prisma.InputJsonValue | null,
    newValue: Prisma.InputJsonValue | null,
  ) {
    return this.prisma.auditLog.create({
      data: {
        tenantId,
        usuarioId: userId,
        accion,
        entidad,
        entidadId,
        oldValue: oldValue ?? Prisma.JsonNull,
        newValue: newValue ?? Prisma.JsonNull,
      },
    });
  }

  private requireTenant(user: RequestUser): string {
    if (!user.tenantId || user.rol === RoleName.SUPER_ADMIN) {
      throw new NotFoundException('Tenant no disponible para esta operacion');
    }
    return user.tenantId;
  }
}
