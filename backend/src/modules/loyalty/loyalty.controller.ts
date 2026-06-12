import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoyaltyService } from './loyalty.service';
import {
  UpdateLoyaltyProgramDto,
  CreateLoyaltyTierDto,
  UpdateLoyaltyTierDto,
  CreateLoyaltyRewardDto,
  UpdateLoyaltyRewardDto,
} from './dto/loyalty.dto';

@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('program')
  @Roles(RoleName.ADMIN_NEGOCIO)
  getProgram(@CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.loyaltyService.getProgram(user.tenantId);
  }

  @Patch('program')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateProgram(@CurrentUser() user: RequestUser, @Body() dto: UpdateLoyaltyProgramDto) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.loyaltyService.updateProgram(user.tenantId, dto, user.id);
  }

  @Get('tiers')
  @Roles(RoleName.ADMIN_NEGOCIO)
  getTiers(@CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.loyaltyService.getTiers(user.tenantId);
  }

  @Post('tiers')
  @Roles(RoleName.ADMIN_NEGOCIO)
  createTier(@CurrentUser() user: RequestUser, @Body() dto: CreateLoyaltyTierDto) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.loyaltyService.createTier(user.tenantId, dto, user.id);
  }

  @Patch('tiers/:id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateTier(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateLoyaltyTierDto) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.loyaltyService.updateTier(user.tenantId, id, dto, user.id);
  }

  @Get('rewards')
  @Roles(RoleName.ADMIN_NEGOCIO)
  getRewards(@CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.loyaltyService.getRewards(user.tenantId);
  }

  @Post('rewards')
  @Roles(RoleName.ADMIN_NEGOCIO)
  createReward(@CurrentUser() user: RequestUser, @Body() dto: CreateLoyaltyRewardDto) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.loyaltyService.createReward(user.tenantId, dto, user.id);
  }

  @Patch('rewards/:id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateReward(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateLoyaltyRewardDto) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.loyaltyService.updateReward(user.tenantId, id, dto, user.id);
  }

  @Get('customers/:customerId')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  getCustomerPoints(@CurrentUser() user: RequestUser, @Param('customerId') customerId: string) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.loyaltyService.getCustomerPoints(user.tenantId, customerId);
  }

  @Get('customers/:customerId/history')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  getCustomerPointHistory(@CurrentUser() user: RequestUser, @Param('customerId') customerId: string) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.loyaltyService.getCustomerPointHistory(user.tenantId, customerId);
  }
}
