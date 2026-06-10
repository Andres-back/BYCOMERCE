import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InventoryMovementType, Prisma } from '../../../database/prisma-client';
import { RequestUser } from '../../../common/types/request-user';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { ImportProductRowDto, ImportProductsDto } from '../dto/import-products.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { InventoryRepository, ProductFilters } from '../repositories/inventory.repository';

@Injectable()
export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  listCategories(user: RequestUser) {
    return this.repository.findCategories(this.requireTenant(user));
  }

  async getCategory(user: RequestUser, id: string) {
    const category = await this.repository.findCategoryById(this.requireTenant(user), id);
    if (!category) throw new NotFoundException('Categoria no encontrada');
    return category;
  }

  async createCategory(user: RequestUser, dto: CreateCategoryDto) {
    const tenantId = this.requireTenant(user);
    const nombre = dto.nombre.trim();
    await this.ensureUniqueCategoryName(tenantId, nombre);
    return this.repository.createCategory(tenantId, user.id, { ...dto, nombre });
  }

  async updateCategory(user: RequestUser, id: string, dto: UpdateCategoryDto) {
    const tenantId = this.requireTenant(user);
    const current = await this.repository.findCategoryById(tenantId, id);
    if (!current) throw new NotFoundException('Categoria no encontrada');

    const nombre = dto.nombre?.trim();
    if (nombre && nombre !== current.nombre) {
      await this.ensureUniqueCategoryName(tenantId, nombre, id);
    }

    return this.repository.updateCategory(tenantId, user.id, id, { ...dto, nombre });
  }

  async deleteCategory(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    const current = await this.repository.findCategoryById(tenantId, id);
    if (!current) throw new NotFoundException('Categoria no encontrada');

    const activeProducts = await this.repository.countActiveProductsByCategory(tenantId, id);
    if (activeProducts > 0) {
      throw new ConflictException('No se puede desactivar una categoria con productos activos');
    }

    return this.repository.disableCategory(tenantId, user.id, id);
  }

  listProducts(user: RequestUser, filters: ProductFilters = {}) {
    return this.repository.findProducts(this.requireTenant(user), filters);
  }

  async exportProducts(user: RequestUser, filters: ProductFilters = {}) {
    const tenantId = this.requireTenant(user);
    const products = await this.repository.findProducts(tenantId, filters);
    const rows = products.map((product) => ({
      nombre: product.nombre,
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      categoria: product.category?.nombre ?? '',
      marca: product.marca ?? '',
      descripcion: product.descripcion ?? '',
      costo: product.costo,
      precio: product.precio,
      stock: product.stock,
      stockMinimo: product.stockMinimo,
      imagenPrincipal: product.imagenPrincipal ?? '',
      destacado: product.destacado ? 'true' : 'false',
    }));

    const metadata: Prisma.InputJsonObject = {
      rows: rows.length,
      filters: {
        q: filters.q ?? null,
        categoryId: filters.categoryId ?? null,
        stockStatus: filters.stockStatus ?? null,
      },
    };
    await this.repository.logAudit(tenantId, user.id, 'PRODUCTS_EXPORTED', 'products', metadata);

    return {
      filename: `productos-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv; charset=utf-8',
      csv: this.toCsv(rows),
      rows,
    };
  }

  async importProducts(user: RequestUser, dto: ImportProductsDto) {
    const tenantId = this.requireTenant(user);
    const created: Array<{ id: string; nombre: string; sku?: string | null }> = [];
    const skipped: Array<{ row: number; nombre?: string; reason: string }> = [];

    for (const [index, row] of dto.products.entries()) {
      try {
        const categoryId = await this.resolveImportCategory(user, tenantId, row);
        const product = await this.createProduct(user, {
          categoryId,
          sku: row.sku,
          barcode: row.barcode,
          nombre: row.nombre,
          descripcion: row.descripcion,
          marca: row.marca,
          costo: row.costo,
          precio: row.precio,
          stock: row.stock,
          stockMinimo: row.stockMinimo,
          imagenPrincipal: row.imagenPrincipal,
          destacado: row.destacado,
        });
        created.push({ id: product.id, nombre: product.nombre, sku: product.sku });
      } catch (err) {
        skipped.push({
          row: index + 2,
          nombre: row.nombre,
          reason: err instanceof Error ? err.message : 'No fue posible importar la fila',
        });
      }
    }

    await this.repository.logAudit(tenantId, user.id, 'PRODUCTS_IMPORTED', 'products', {
      created: created.length,
      skipped: skipped.length,
    });

    return { created, skipped };
  }

  async getProduct(user: RequestUser, id: string) {
    const product = await this.repository.findProductById(this.requireTenant(user), id);
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async createProduct(user: RequestUser, dto: CreateProductDto) {
    const tenantId = this.requireTenant(user);
    await this.ensureProductLimitAvailable(tenantId);
    await this.ensureCategoryBelongsToTenant(tenantId, dto.categoryId);
    await this.ensureUniqueProductIdentity(tenantId, dto);
    return this.repository.createProduct(tenantId, user.id, dto);
  }

  async updateProduct(user: RequestUser, id: string, dto: UpdateProductDto) {
    const tenantId = this.requireTenant(user);
    const current = await this.repository.findProductById(tenantId, id);
    if (!current) throw new NotFoundException('Producto no encontrado');

    await this.ensureCategoryBelongsToTenant(tenantId, dto.categoryId);
    await this.ensureUniqueProductIdentity(tenantId, dto, id);

    return this.repository.updateProduct(tenantId, user.id, id, dto);
  }

  async deleteProduct(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    const product = await this.repository.findProductById(tenantId, id);
    if (!product) throw new NotFoundException('Producto no encontrado');
    return this.repository.disableProduct(tenantId, user.id, id);
  }

  async duplicateProduct(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    await this.ensureProductLimitAvailable(tenantId);
    const product = await this.repository.findProductById(tenantId, id);
    if (!product) throw new NotFoundException('Producto no encontrado');

    const sku = await this.buildDuplicateSku(tenantId, product.sku);
    return this.repository.duplicateProduct(tenantId, user.id, id, sku);
  }

  async listProductMovements(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    const product = await this.repository.findProductById(tenantId, id, true);
    if (!product) throw new NotFoundException('Producto no encontrado');
    return this.repository.findProductMovements(tenantId, id);
  }

  async adjustStock(user: RequestUser, id: string, dto: AdjustStockDto) {
    const tenantId = this.requireTenant(user);
    const product = await this.repository.findProductById(tenantId, id);
    if (!product) throw new NotFoundException('Producto no encontrado');

    const { stockNuevo, cantidad } = this.resolveStockChange(product.stock, dto);
    if (cantidad === 0) {
      throw new BadRequestException('El ajuste no cambia el stock');
    }

    return this.repository.adjustStock(tenantId, user.id, id, dto, stockNuevo, cantidad);
  }

  private async ensureUniqueCategoryName(tenantId: string, nombre: string, excludeId?: string) {
    const existing = await this.repository.findCategoryByName(tenantId, nombre, excludeId);
    if (existing) throw new ConflictException('Ya existe una categoria con este nombre');
  }

  private async ensureCategoryBelongsToTenant(tenantId: string, categoryId?: string) {
    if (!categoryId) return;
    const category = await this.repository.findCategoryById(tenantId, categoryId);
    if (!category) throw new NotFoundException('Categoria no encontrada');
  }

  private async ensureUniqueProductIdentity(tenantId: string, dto: Pick<CreateProductDto, 'sku' | 'barcode'>, excludeId?: string) {
    const sku = this.normalizedOptional(dto.sku);
    if (sku) {
      const existing = await this.repository.findProductBySku(tenantId, sku, excludeId);
      if (existing) throw new ConflictException('Ya existe un producto con este SKU');
    }

    const barcode = this.normalizedOptional(dto.barcode);
    if (barcode) {
      const existing = await this.repository.findProductByBarcode(tenantId, barcode, excludeId);
      if (existing) throw new ConflictException('Ya existe un producto con este codigo de barras');
    }
  }

  private async ensureProductLimitAvailable(tenantId: string) {
    const tenant = await this.repository.findTenantPlan(tenantId);
    const limit = tenant?.plan?.limiteProductos;
    if (!limit) return;

    const activeProducts = await this.repository.countActiveProducts(tenantId);
    if (activeProducts >= limit) {
      throw new UnprocessableEntityException({
        error: 'PLAN_LIMIT_EXCEEDED',
        message: 'Limite de productos activos alcanzado para el plan',
        details: {
          recurso: 'productos',
          uso: activeProducts,
          limite: limit,
        },
      });
    }
  }

  private async buildDuplicateSku(tenantId: string, sourceSku?: string | null) {
    const normalized = this.normalizedOptional(sourceSku ?? undefined);
    if (!normalized) return null;

    const suffix = Date.now().toString(36).toUpperCase();
    const candidate = `${normalized.slice(0, 80 - suffix.length - 7)}-COPIA-${suffix}`;
    const existing = await this.repository.findProductBySku(tenantId, candidate);
    return existing ? null : candidate;
  }

  private async resolveImportCategory(user: RequestUser, tenantId: string, row: ImportProductRowDto) {
    if (row.categoryId) return row.categoryId;
    const categoryName = this.normalizedOptional(row.categoryName);
    if (!categoryName) return undefined;

    const existing = await this.repository.findCategoryByName(tenantId, categoryName);
    if (existing) return existing.id;

    const category = await this.createCategory(user, { nombre: categoryName });
    return category.id;
  }

  private resolveStockChange(currentStock: number, dto: AdjustStockDto) {
    if (dto.tipo === InventoryMovementType.AJUSTE) {
      if (dto.stockNuevo === undefined) throw new BadRequestException('stockNuevo es requerido para AJUSTE');
      return { stockNuevo: dto.stockNuevo, cantidad: Math.abs(dto.stockNuevo - currentStock) };
    }

    if (dto.cantidad === undefined) throw new BadRequestException('cantidad es requerida para este movimiento');

    if (dto.tipo === InventoryMovementType.ENTRADA || dto.tipo === InventoryMovementType.DEVOLUCION) {
      return { stockNuevo: currentStock + dto.cantidad, cantidad: dto.cantidad };
    }

    if (dto.tipo === InventoryMovementType.SALIDA || dto.tipo === InventoryMovementType.PERDIDA) {
      const stockNuevo = currentStock - dto.cantidad;
      if (stockNuevo < 0) throw new UnprocessableEntityException('El movimiento dejaria stock negativo');
      return { stockNuevo, cantidad: dto.cantidad };
    }

    throw new BadRequestException('Tipo de movimiento no soportado');
  }

  private normalizedOptional(value?: string) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  }

  private toCsv(rows: Array<Record<string, string | number>>) {
    const headers = [
      'nombre',
      'sku',
      'barcode',
      'categoria',
      'marca',
      'descripcion',
      'costo',
      'precio',
      'stock',
      'stockMinimo',
      'imagenPrincipal',
      'destacado',
    ];
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((header) => this.csvCell(row[header] ?? '')).join(','));
    }
    return lines.join('\n');
  }

  private csvCell(value: string | number) {
    const text = String(value);
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private requireTenant(user: RequestUser): string {
    if (!user.tenantId) {
      throw new NotFoundException('Tenant no disponible para esta operacion');
    }
    return user.tenantId;
  }
}
