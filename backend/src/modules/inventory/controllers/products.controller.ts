import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '../../../database/prisma-client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequestUser } from '../../../common/types/request-user';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { ImportProductsDto } from '../dto/import-products.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductFilters } from '../repositories/inventory.repository';
import { InventoryService } from '../services/inventory.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  list(
    @CurrentUser() user: RequestUser,
    @Query('q') query?: string,
    @Query('categoryId') categoryId?: string,
    @Query('stockStatus') stockStatus?: ProductFilters['stockStatus'],
  ) {
    return this.inventoryService.listProducts(user, { q: query, categoryId, stockStatus });
  }

  @Get('export')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  export(
    @CurrentUser() user: RequestUser,
    @Query('q') query?: string,
    @Query('categoryId') categoryId?: string,
    @Query('stockStatus') stockStatus?: ProductFilters['stockStatus'],
  ) {
    return this.inventoryService.exportProducts(user, { q: query, categoryId, stockStatus });
  }

  @Get(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.inventoryService.getProduct(user, id);
  }

  @Post('import')
  @Roles(RoleName.ADMIN_NEGOCIO)
  import(@CurrentUser() user: RequestUser, @Body() dto: ImportProductsDto) {
    return this.inventoryService.importProducts(user, dto);
  }

  @Post()
  @Roles(RoleName.ADMIN_NEGOCIO)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(user, dto);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.inventoryService.updateProduct(user, id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.inventoryService.deleteProduct(user, id);
  }

  @Post(':id/duplicate')
  @Roles(RoleName.ADMIN_NEGOCIO)
  duplicate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.inventoryService.duplicateProduct(user, id);
  }

  @Get(':id/movements')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  movements(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.inventoryService.listProductMovements(user, id);
  }

  @Post(':id/adjust-stock')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  adjustStock(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(user, id, dto);
  }
}
