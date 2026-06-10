import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '../../../database/prisma-client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequestUser } from '../../../common/types/request-user';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateSupplierDto, SupplierQueryDto, UpdateSupplierDto } from '../dto/supplier.dto';
import { ProcurementService } from '../services/procurement.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  list(@CurrentUser() user: RequestUser, @Query() query: SupplierQueryDto) {
    return this.procurementService.listSuppliers(user, query);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.procurementService.getSupplier(user, id);
  }

  @Post()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSupplierDto) {
    return this.procurementService.createSupplier(user, dto);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.procurementService.updateSupplier(user, id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.procurementService.deleteSupplier(user, id);
  }
}
