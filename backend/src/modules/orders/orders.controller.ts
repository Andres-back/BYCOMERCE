import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { RoleName } from '../../database/prisma-client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { DeliverOrderDto } from './dto/deliver-order.dto';
import { OrderActionDto } from './dto/order-action.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createPublic(@Body() dto: CreateOrderDto) {
    return this.ordersService.createPublicOrder(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO, RoleName.DOMICILIARIO)
  list(@CurrentUser() user: RequestUser) {
    return this.ordersService.listOrders(user);
  }

  @Get('delivery-users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  deliveryUsers(@CurrentUser() user: RequestUser) {
    return this.ordersService.listDeliveryUsers(user);
  }

  @Get('delivery-route')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.DOMICILIARIO)
  getDeliveryRoute(@CurrentUser() user: RequestUser) {
    return this.ordersService.getDeliveryRoute(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO, RoleName.DOMICILIARIO)
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.getOrder(user, id);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  confirm(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.confirmOrder(user, id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  reject(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: OrderActionDto) {
    return this.ordersService.rejectOrder(user, id, dto.motivo);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  cancel(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: OrderActionDto) {
    return this.ordersService.cancelOrder(user, id, dto.motivo);
  }

  @Post(':id/preparing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  preparing(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.markPreparing(user, id);
  }

  @Post(':id/ready')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  ready(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.markReady(user, id);
  }

  @Post(':id/dispatch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.DOMICILIARIO)
  dispatch(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.dispatchOrder(user, id);
  }

  @Post(':id/deliver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.DOMICILIARIO)
  deliver(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: DeliverOrderDto) {
    return this.ordersService.deliverOrder(user, id, dto);
  }

  @Post(':id/assign-delivery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  assignDelivery(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: AssignDeliveryDto) {
    return this.ordersService.assignDelivery(user, id, dto);
  }
}
