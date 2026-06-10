import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  dashboard(@CurrentUser() user: RequestUser, @Query() query: ReportQueryDto) {
    return this.reportsService.getDashboard(user, query);
  }

  @Get('sales')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  sales(@CurrentUser() user: RequestUser, @Query() query: ReportQueryDto) {
    return this.reportsService.getSalesReport(user, query);
  }

  @Get('products')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  products(@CurrentUser() user: RequestUser, @Query() query: ReportQueryDto) {
    return this.reportsService.getProductsReport(user, query);
  }

  @Get('inventory')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  inventory(@CurrentUser() user: RequestUser) {
    return this.reportsService.getInventoryReport(user);
  }

  @Get('customers')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  customers(@CurrentUser() user: RequestUser, @Query() query: ReportQueryDto) {
    return this.reportsService.getCustomersReport(user, query);
  }
}
