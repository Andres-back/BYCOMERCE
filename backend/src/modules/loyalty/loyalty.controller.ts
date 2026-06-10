import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoyaltyService } from './loyalty.service';

@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('program')
  @Roles(RoleName.ADMIN_NEGOCIO)
  getProgram(@CurrentUser() user: RequestUser) {
    return this.loyaltyService.getProgram(user.tenantId!);
  }

  @Patch('program')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateProgram(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.loyaltyService.updateProgram(user.tenantId!, body, user.id);
  }

  @Get('tiers')
  @Roles(RoleName.ADMIN_NEGOCIO)
  getTiers(@CurrentUser() user: RequestUser) {
    return this.loyaltyService.getTiers(user.tenantId!);
  }

  @Post('tiers')
  @Roles(RoleName.ADMIN_NEGOCIO)
  createTier(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.loyaltyService.createTier(user.tenantId!, body, user.id);
  }

  @Patch('tiers/:id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateTier(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) {
    return this.loyaltyService.updateTier(user.tenantId!, id, body, user.id);
  }

  @Get('rewards')
  @Roles(RoleName.ADMIN_NEGOCIO)
  getRewards(@CurrentUser() user: RequestUser) {
    return this.loyaltyService.getRewards(user.tenantId!);
  }

  @Post('rewards')
  @Roles(RoleName.ADMIN_NEGOCIO)
  createReward(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.loyaltyService.createReward(user.tenantId!, body, user.id);
  }

  @Patch('rewards/:id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateReward(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) {
    return this.loyaltyService.updateReward(user.tenantId!, id, body, user.id);
  }

  @Get('customers/:customerId')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  getCustomerPoints(@CurrentUser() user: RequestUser, @Param('customerId') customerId: string) {
    return this.loyaltyService.getCustomerPoints(user.tenantId!, customerId);
  }

  @Get('customers/:customerId/history')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  getCustomerPointHistory(@CurrentUser() user: RequestUser, @Param('customerId') customerId: string) {
    return this.loyaltyService.getCustomerPointHistory(user.tenantId!, customerId);
  }
}
