import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { RoleName } from '../../database/prisma-client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RefundSaleDto, VoidSaleDto } from './dto/refund-sale.dto';
import { PosService } from './pos.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  list(@CurrentUser() user: RequestUser) {
    return this.posService.listSales(user);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.posService.getSale(user, id);
  }

  @Post()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSaleDto) {
    return this.posService.createSale(user, dto);
  }

  @Post(':id/void')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  void(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: VoidSaleDto) {
    return this.posService.voidSale(user, id, dto);
  }

  @Post(':id/refund')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  refund(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: RefundSaleDto) {
    return this.posService.refundSale(user, id, dto);
  }
}
