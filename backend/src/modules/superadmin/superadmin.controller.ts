import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { SuperadminService } from './superadmin.service';
import {
  ImpersonateDto,
  ProcessPaymentDto,
  UpdateTenantStatusDto,
  CreateTenantDto,
  CreatePlanDto,
  UpdatePlanDto,
  CreateUserForTenantDto,
  AuditLogQueryDto,
} from './dto/superadmin.dto';
import { AuthService } from '../auth/auth.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.SUPER_ADMIN)
export class SuperadminController {
  constructor(
    private readonly superadminService: SuperadminService,
    private readonly authService: AuthService,
  ) {}

  @Get('superadmin/stats')
  getStats() {
    return this.superadminService.getSystemStats();
  }

  @Get('superadmin/tenants')
  listTenants(
    @Query('q') q?: string,
    @Query('estado') estado?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.superadminService.listTenants({ q, estado, page, pageSize });
  }

  @Post('superadmin/tenants')
  createTenant(@Body() dto: CreateTenantDto, @CurrentUser() user: RequestUser) {
    return this.superadminService.createTenant(dto, user.id);
  }

  @Get('superadmin/tenants/:id')
  getTenantDetail(@Param('id') id: string) {
    return this.superadminService.getTenantDetail(id);
  }

  @Post('superadmin/tenants/:id/suspend')
  suspendTenant(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.superadminService.suspendTenant(id, dto.motivo, user.id);
  }

  @Post('superadmin/tenants/:id/reactivate')
  reactivateTenant(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.superadminService.reactivateTenant(id, user.id);
  }

  @Post('superadmin/tenants/:id/users')
  createUserForTenant(
    @Param('id') id: string,
    @Body() dto: CreateUserForTenantDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.superadminService.createUserForTenant(id, dto, user.id);
  }

  @Get('superadmin/tenants/:id/products')
  getTenantProducts(
    @Param('id') id: string,
    @Query('q') q?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.superadminService.getTenantProducts(id, { q, page, pageSize });
  }

  @Get('superadmin/tenants/:id/orders')
  getTenantOrders(
    @Param('id') id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.superadminService.getTenantOrders(id, { page, pageSize });
  }

  @Get('superadmin/tenants/:id/sales')
  getTenantSales(
    @Param('id') id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.superadminService.getTenantSales(id, { page, pageSize });
  }

  @Get('superadmin/plans')
  listPlans(@Query('includeInactive') includeInactive?: string) {
    return this.superadminService.listAllPlans(includeInactive === 'true');
  }

  @Post('superadmin/plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.superadminService.createPlan(dto);
  }

  @Patch('superadmin/plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.superadminService.updatePlan(id, dto);
  }

  @Delete('superadmin/plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.superadminService.deletePlan(id);
  }

  @Get('superadmin/audit-logs')
  getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.superadminService.getAuditLogs(query);
  }

  @Get('superadmin/payments')
  listPendingPayments(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.superadminService.listPendingPayments(page, pageSize);
  }

  @Post('superadmin/payments/:id/confirm')
  confirmPayment(
    @Param('id') id: string,
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.superadminService.confirmPayment(id, user.id, dto.observaciones);
  }

  @Post('superadmin/payments/:id/reject')
  rejectPayment(
    @Param('id') id: string,
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.superadminService.rejectPayment(id, user.id, dto.observaciones);
  }

  @Post('superadmin/impersonate')
  impersonate(@Body() dto: ImpersonateDto, @CurrentUser() user: RequestUser) {
    return this.superadminService.impersonate(dto.userId, {
      id: user.id,
      tenantId: user.tenantId,
    });
  }

  @Post('auth/impersonate')
  async loginAsUser(@Body() dto: ImpersonateDto, @CurrentUser() user: RequestUser) {
    const target = await this.superadminService.impersonate(dto.userId, {
      id: user.id,
      tenantId: user.tenantId,
    });

    return this.authService.impersonateIssue(
      { id: user.id, email: user.email, rol: user.rol, tenantId: user.tenantId!, isSuperAdmin: true },
      {
        id: target.userId,
        email: target.email,
        nombre: target.nombre,
        rol: target.rol,
        tenantId: target.tenantId,
        isSuperAdmin: false,
      },
    );
  }
}
