import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VisionImageDto } from '../ai/dto/vision.dto';
import { CreateExpenseDto, ExpenseQueryDto, UpdateExpenseDto } from './dto/expense.dto';
import { FinanceService } from './finance.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  list(@CurrentUser() user: RequestUser, @Query() query: ExpenseQueryDto) {
    return this.financeService.listExpenses(user, query);
  }

  @Post()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateExpenseDto) {
    return this.financeService.createExpense(user, dto);
  }

  @Post('receipt/extract')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  extractReceipt(@CurrentUser() user: RequestUser, @Body() dto: VisionImageDto) {
    return this.financeService.extractExpenseReceipt(user, dto);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.financeService.getExpense(user, id);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.financeService.updateExpense(user, id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.financeService.deleteExpense(user, id);
  }
}
