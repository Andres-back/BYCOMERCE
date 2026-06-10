import { Injectable } from '@nestjs/common';
import { EstadoGeneral, InventoryMovementType, Prisma } from '../../../database/prisma-client';
import { PrismaService } from '../../../database/prisma.service';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

export interface ProductFilters {
  q?: string;
  categoryId?: string;
  stockStatus?: 'available' | 'low' | 'out';
}

@Injectable()
export class InventoryRepository {
  private readonly productInclude = {
    category: true,
    images: { orderBy: { orden: 'asc' } },
    variants: { where: { estado: EstadoGeneral.ACTIVO } },
  } satisfies Prisma.ProductInclude;

  constructor(private readonly prisma: PrismaService) {}

  findCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, estado: EstadoGeneral.ACTIVO },
      orderBy: { nombre: 'asc' },
    });
  }

  findCategoryById(tenantId: string, id: string, includeInactive = false) {
    return this.prisma.category.findFirst({
      where: { id, tenantId, ...(includeInactive ? {} : { estado: EstadoGeneral.ACTIVO }) },
    });
  }

  findCategoryByName(tenantId: string, nombre: string, excludeId?: string) {
    return this.prisma.category.findFirst({
      where: {
        tenantId,
        nombre: { equals: nombre, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  countActiveProductsByCategory(tenantId: string, categoryId: string) {
    return this.prisma.product.count({
      where: { tenantId, categoryId, estado: EstadoGeneral.ACTIVO },
    });
  }

  countActiveProducts(tenantId: string) {
    return this.prisma.product.count({
      where: { tenantId, estado: EstadoGeneral.ACTIVO },
    });
  }

  findTenantPlan(tenantId: string) {
    return this.prisma.tenant.findFirst({
      where: { id: tenantId },
      include: { plan: true },
    });
  }

  createCategory(tenantId: string, userId: string, dto: CreateCategoryDto) {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: {
          tenantId,
          nombre: dto.nombre.trim(),
          descripcion: this.optionalString(dto.descripcion),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: userId,
          accion: 'CATEGORY_CREATED',
          entidad: 'categories',
          entidadId: category.id,
          oldValue: Prisma.JsonNull,
          newValue: category,
        },
      });

      return category;
    });
  }

  updateCategory(tenantId: string, userId: string, id: string, dto: UpdateCategoryDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.category.findFirstOrThrow({ where: { id, tenantId } });
      const category = await tx.category.update({
        where: { id },
        data: {
          nombre: dto.nombre?.trim(),
          descripcion: this.optionalString(dto.descripcion),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: userId,
          accion: 'CATEGORY_UPDATED',
          entidad: 'categories',
          entidadId: category.id,
          oldValue: current,
          newValue: category,
        },
      });

      return category;
    });
  }

  disableCategory(tenantId: string, userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.category.findFirstOrThrow({ where: { id, tenantId } });
      const category = await tx.category.update({
        where: { id },
        data: { estado: EstadoGeneral.INACTIVO },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: userId,
          accion: 'CATEGORY_DISABLED',
          entidad: 'categories',
          entidadId: category.id,
          oldValue: current,
          newValue: category,
        },
      });

      return category;
    });
  }

  findProducts(tenantId: string, filters: ProductFilters = {}) {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      estado: EstadoGeneral.ACTIVO,
      ...(filters.q
        ? {
            OR: [
              { nombre: { contains: filters.q, mode: 'insensitive' } },
              { sku: { contains: filters.q, mode: 'insensitive' } },
              { barcode: { contains: filters.q, mode: 'insensitive' } },
              { marca: { contains: filters.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...this.stockStatusWhere(filters.stockStatus),
    };

    return this.prisma.product.findMany({
      where,
      include: this.productInclude,
      orderBy: { nombre: 'asc' },
      take: 100,
    });
  }

  findProductById(tenantId: string, id: string, includeInactive = false) {
    return this.prisma.product.findFirst({
      where: { id, tenantId, ...(includeInactive ? {} : { estado: EstadoGeneral.ACTIVO }) },
      include: this.productInclude,
    });
  }

  findProductBySku(tenantId: string, sku: string, excludeId?: string) {
    return this.prisma.product.findFirst({
      where: { tenantId, sku, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
  }

  findProductByBarcode(tenantId: string, barcode: string, excludeId?: string) {
    return this.prisma.product.findFirst({
      where: { tenantId, barcode, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
  }

  createProduct(tenantId: string, userId: string, dto: CreateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          tenantId,
          categoryId: dto.categoryId,
          sku: this.nullableString(dto.sku),
          barcode: this.nullableString(dto.barcode),
          nombre: dto.nombre.trim(),
          descripcion: this.optionalString(dto.descripcion),
          marca: this.optionalString(dto.marca),
          costo: dto.costo,
          precio: dto.precio,
          stock: dto.stock,
          stockMinimo: dto.stockMinimo,
          imagenPrincipal: this.optionalString(dto.imagenPrincipal),
          destacado: dto.destacado ?? false,
        },
        include: this.productInclude,
      });

      if (dto.stock > 0) {
        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: product.id,
            tipo: InventoryMovementType.ENTRADA,
            cantidad: dto.stock,
            stockAnterior: 0,
            stockNuevo: dto.stock,
            observacion: 'Stock inicial',
            usuarioId: userId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: userId,
          accion: 'PRODUCT_CREATED',
          entidad: 'products',
          entidadId: product.id,
          oldValue: Prisma.JsonNull,
          newValue: product,
        },
      });

      return product;
    });
  }

  updateProduct(tenantId: string, userId: string, id: string, dto: UpdateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.product.findFirstOrThrow({ where: { id, tenantId } });
      const product = await tx.product.update({
        where: { id },
        data: {
          categoryId: dto.categoryId,
          sku: this.optionalString(dto.sku),
          barcode: this.optionalString(dto.barcode),
          nombre: dto.nombre?.trim(),
          descripcion: this.optionalString(dto.descripcion),
          marca: this.optionalString(dto.marca),
          costo: dto.costo,
          precio: dto.precio,
          stockMinimo: dto.stockMinimo,
          imagenPrincipal: this.optionalString(dto.imagenPrincipal),
          destacado: dto.destacado,
        },
        include: this.productInclude,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: userId,
          accion: 'PRODUCT_UPDATED',
          entidad: 'products',
          entidadId: product.id,
          oldValue: current,
          newValue: product,
        },
      });

      return product;
    });
  }

  disableProduct(tenantId: string, userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.product.findFirstOrThrow({ where: { id, tenantId } });
      const product = await tx.product.update({
        where: { id },
        data: { estado: EstadoGeneral.INACTIVO },
        include: this.productInclude,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: userId,
          accion: 'PRODUCT_DISABLED',
          entidad: 'products',
          entidadId: product.id,
          oldValue: current,
          newValue: product,
        },
      });

      return product;
    });
  }

  duplicateProduct(tenantId: string, userId: string, sourceId: string, sku: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const source = await tx.product.findFirstOrThrow({ where: { id: sourceId, tenantId } });
      const product = await tx.product.create({
        data: {
          tenantId,
          categoryId: source.categoryId,
          sku,
          barcode: null,
          nombre: `${source.nombre} copia`.slice(0, 180),
          descripcion: source.descripcion,
          marca: source.marca,
          costo: source.costo,
          precio: source.precio,
          stock: 0,
          stockMinimo: source.stockMinimo,
          imagenPrincipal: source.imagenPrincipal,
          destacado: false,
        },
        include: this.productInclude,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: userId,
          accion: 'PRODUCT_DUPLICATED',
          entidad: 'products',
          entidadId: product.id,
          oldValue: source,
          newValue: product,
          metadata: { sourceId },
        },
      });

      return product;
    });
  }

  findProductMovements(tenantId: string, productId: string) {
    return this.prisma.inventoryMovement.findMany({
      where: { tenantId, productId },
      orderBy: { fecha: 'desc' },
      take: 100,
    });
  }

  adjustStock(tenantId: string, userId: string, productId: string, dto: AdjustStockDto, stockNuevo: number, cantidad: number) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.product.findFirstOrThrow({ where: { id: productId, tenantId } });
      const product = await tx.product.update({
        where: { id: productId },
        data: { stock: stockNuevo },
        include: this.productInclude,
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          tenantId,
          productId,
          tipo: dto.tipo,
          cantidad,
          stockAnterior: current.stock,
          stockNuevo,
          observacion: dto.observacion,
          usuarioId: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          usuarioId: userId,
          accion: 'PRODUCT_STOCK_ADJUSTED',
          entidad: 'products',
          entidadId: product.id,
          oldValue: current,
          newValue: product,
          metadata: { movementId: movement.id, tipo: dto.tipo, cantidad },
        },
      });

      return { product, movement };
    });
  }

  logAudit(
    tenantId: string,
    userId: string,
    accion: string,
    entidad: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        tenantId,
        usuarioId: userId,
        accion,
        entidad,
        oldValue: Prisma.JsonNull,
        newValue: Prisma.JsonNull,
        metadata: metadata ?? Prisma.JsonNull,
      },
    });
  }

  private stockStatusWhere(stockStatus?: ProductFilters['stockStatus']): Prisma.ProductWhereInput {
    if (stockStatus === 'out') return { stock: { lte: 0 } };
    if (stockStatus === 'low') {
      return {
        stock: { gt: 0 },
        stockMinimo: { gt: 0 },
        AND: [{ stock: { lte: this.prisma.product.fields.stockMinimo } }],
      };
    }
    if (stockStatus === 'available') {
      return {
        OR: [
          { stockMinimo: { lte: 0 }, stock: { gt: 0 } },
          { stockMinimo: { gt: 0 }, stock: { gt: this.prisma.product.fields.stockMinimo } },
        ],
      };
    }
    return {};
  }

  private optionalString(value?: string) {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private nullableString(value?: string) {
    return this.optionalString(value) ?? null;
  }
}
