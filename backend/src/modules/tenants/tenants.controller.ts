import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { RegisterSubscriptionPaymentDto } from './dto/register-subscription-payment.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { BrandingVisionDto } from '../ai/dto/vision.dto';
import { UpdateTenantAiSettingsDto } from '../ai/dto/ai-settings.dto';
import {
  CreateBusinessImageDto,
  ReorderBusinessImagesDto,
  UpdateBusinessImageDto,
} from './dto/business-image.dto';
import { TenantsService } from './tenants.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get(['tenant/profile', 'tenants/me'])
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  getMe(@CurrentUser() user: RequestUser) {
    return this.tenantsService.getBusinessProfile(user);
  }

  @Patch(['tenant/profile', 'tenants/me'])
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateBusinessProfileDto) {
    return this.tenantsService.updateBusinessProfile(user, dto);
  }

  @Get('tenants/me/settings')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  getSettings(@CurrentUser() user: RequestUser) {
    return this.tenantsService.getBusinessSettings(user);
  }

  @Patch('tenants/me/settings')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateBusinessProfileDto) {
    return this.tenantsService.updateBusinessProfile(user, dto);
  }

  @Get('tenants/me/ai-settings')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  getAiSettings(@CurrentUser() user: RequestUser) {
    return this.tenantsService.getAiSettings(user);
  }

  @Patch('tenants/me/ai-settings')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateAiSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateTenantAiSettingsDto) {
    return this.tenantsService.updateAiSettings(user, dto);
  }

  @Post('tenants/me/ai/branding/suggest')
  @Roles(RoleName.ADMIN_NEGOCIO)
  suggestBranding(@CurrentUser() user: RequestUser, @Body() dto: BrandingVisionDto) {
    return this.tenantsService.suggestBrandingFromImage(user, dto);
  }

  @Get('tenants/me/gallery')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  listGallery(@CurrentUser() user: RequestUser) {
    return this.tenantsService.listBusinessImages(user);
  }

  @Post('tenants/me/gallery')
  @Roles(RoleName.ADMIN_NEGOCIO)
  addGalleryImage(@CurrentUser() user: RequestUser, @Body() dto: CreateBusinessImageDto) {
    return this.tenantsService.createBusinessImage(user, dto);
  }

  @Patch('tenants/me/gallery/:id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateGalleryImage(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessImageDto,
  ) {
    return this.tenantsService.updateBusinessImage(user, id, dto);
  }

  @Delete('tenants/me/gallery/:id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  deleteGalleryImage(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.tenantsService.deleteBusinessImage(user, id);
  }

  @Post('tenants/me/gallery/reorder')
  @Roles(RoleName.ADMIN_NEGOCIO)
  reorderGallery(@CurrentUser() user: RequestUser, @Body() dto: ReorderBusinessImagesDto) {
    return this.tenantsService.reorderBusinessImages(user, dto);
  }

  @Get('tenants/me/subscription')
  @Roles(RoleName.ADMIN_NEGOCIO)
  getSubscription(@CurrentUser() user: RequestUser) {
    return this.tenantsService.getSubscription(user);
  }

  @Post('tenants/me/subscription/change-plan')
  @Roles(RoleName.ADMIN_NEGOCIO)
  changePlan(@CurrentUser() user: RequestUser, @Body() dto: ChangePlanDto) {
    return this.tenantsService.changePlan(user, dto);
  }

  @Post('tenants/me/subscription/cancel')
  @Roles(RoleName.ADMIN_NEGOCIO)
  cancelSubscription(@CurrentUser() user: RequestUser, @Body() dto: CancelSubscriptionDto) {
    return this.tenantsService.cancelSubscription(user, dto);
  }

  @Get('tenants/me/subscription/payments')
  @Roles(RoleName.ADMIN_NEGOCIO)
  listSubscriptionPayments(@CurrentUser() user: RequestUser) {
    return this.tenantsService.listSubscriptionPayments(user);
  }

  @Post('tenants/me/subscription/payments')
  @Roles(RoleName.ADMIN_NEGOCIO)
  registerSubscriptionPayment(@CurrentUser() user: RequestUser, @Body() dto: RegisterSubscriptionPaymentDto) {
    return this.tenantsService.registerSubscriptionPayment(user, dto);
  }
}
