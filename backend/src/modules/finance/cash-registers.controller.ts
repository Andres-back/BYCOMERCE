import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CloseCashRegisterDto, OpenCashRegisterDto } from './dto/cash-register-action.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { FinanceService } from './finance.service';

@Controller('cash-registers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashRegistersController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  list(@CurrentUser() user: RequestUser) {
    return this.financeService.listCashRegisters(user);
  }

  @Get('current')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  current(@CurrentUser() user: RequestUser) {
    return this.financeService.getCurrentCashRegister(user);
  }

  @Post('open')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  open(@CurrentUser() user: RequestUser, @Body() dto: OpenCashRegisterDto) {
    return this.financeService.openCashRegister(user, dto);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.financeService.getCashRegister(user, id);
  }

  @Post(':id/close')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  close(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CloseCashRegisterDto) {
    return this.financeService.closeCashRegister(user, id, dto);
  }

  @Get(':id/movements')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  movements(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.financeService.listCashMovements(user, id);
  }

  @Post(':id/movements')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  createMovement(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateCashMovementDto) {
    return this.financeService.createCashMovement(user, id, dto);
  }
}
