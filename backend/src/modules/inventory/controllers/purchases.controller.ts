import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '../../../database/prisma-client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RequestUser } from '../../../common/types/request-user';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePurchaseDto, ExtractPurchaseInvoiceDto, PurchaseQueryDto, UpdatePurchaseInvoiceDto } from '../dto/purchase.dto';
import { InvoiceVisionService } from '../services/invoice-vision.service';
import { ProcurementService } from '../services/procurement.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
  constructor(
    private readonly procurementService: ProcurementService,
    private readonly invoiceVisionService: InvoiceVisionService,
  ) {}

  @Get()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  list(@CurrentUser() user: RequestUser, @Query() query: PurchaseQueryDto) {
    return this.procurementService.listPurchases(user, query);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.procurementService.getPurchase(user, id);
  }

  @Post()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePurchaseDto) {
    return this.procurementService.createPurchase(user, dto);
  }

  @Post('invoice/extract')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  extractInvoice(@CurrentUser() user: RequestUser, @Body() dto: ExtractPurchaseInvoiceDto) {
    return this.invoiceVisionService.extract(this.requireTenant(user), dto);
  }

  @Patch(':id/invoice')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  updateInvoice(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdatePurchaseInvoiceDto) {
    return this.procurementService.updatePurchaseInvoice(user, id, dto);
  }

  @Post(':id/cancel')
  @Roles(RoleName.ADMIN_NEGOCIO)
  cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.procurementService.cancelPurchase(user, id);
  }

  private requireTenant(user: RequestUser) {
    if (!user.tenantId) {
      throw new NotFoundException('Tenant no disponible para esta operacion');
    }
    return user.tenantId;
  }
}
