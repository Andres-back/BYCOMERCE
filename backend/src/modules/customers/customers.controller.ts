import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  list(@CurrentUser() user: RequestUser, @Query() query: CustomerQueryDto) {
    return this.customersService.listCustomers(user, query);
  }

  @Post()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCustomerDto) {
    return this.customersService.createCustomer(user, dto);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.customersService.getCustomer(user, id);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.updateCustomer(user, id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.customersService.deleteCustomer(user, id);
  }

  @Get(':id/history')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  history(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.customersService.getCustomerHistory(user, id);
  }
}
