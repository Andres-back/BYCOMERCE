import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '../../../database/prisma-client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequestUser } from '../../../common/types/request-user';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { InventoryService } from '../services/inventory.service';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  list(@CurrentUser() user: RequestUser) {
    return this.inventoryService.listCategories(user);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.inventoryService.getCategory(user, id);
  }

  @Post()
  @Roles(RoleName.ADMIN_NEGOCIO)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCategoryDto) {
    return this.inventoryService.createCategory(user, dto);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.inventoryService.updateCategory(user, id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.inventoryService.deleteCategory(user, id);
  }
}
