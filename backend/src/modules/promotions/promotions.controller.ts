import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePromotionDto, UpdatePromotionDto, CreateCouponDto, UpdateCouponDto } from './dto/create-promotion.dto';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  list(@CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.promotionsService.listPromotions(user.tenantId);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.promotionsService.getPromotion(user.tenantId, id);
  }

  @Post()
  @Roles(RoleName.ADMIN_NEGOCIO)
  create(@Body() dto: CreatePromotionDto, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.promotionsService.createPromotion(user.tenantId, dto, user.id);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.promotionsService.updatePromotion(user.tenantId, id, dto, user.id);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.promotionsService.deletePromotion(user.tenantId, id, user.id);
  }

  @Get('coupons/list')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  listCoupons(@CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.promotionsService.listCoupons(user.tenantId);
  }

  @Post('coupons')
  @Roles(RoleName.ADMIN_NEGOCIO)
  createCoupon(@Body() dto: CreateCouponDto, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.promotionsService.createCoupon(user.tenantId, dto, user.id);
  }

  @Patch('coupons/:id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.promotionsService.updateCoupon(user.tenantId, id, dto, user.id);
  }

  @Delete('coupons/:id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  deleteCoupon(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.promotionsService.deleteCoupon(user.tenantId, id, user.id);
  }
}
