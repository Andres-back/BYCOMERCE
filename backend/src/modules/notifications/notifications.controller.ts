import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { NotificationsService } from './notifications.service';
import { BulkUpdatePreferencesDto } from './dto/notification-preference.dto';
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto } from './dto/notification-template.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO, RoleName.DOMICILIARIO)
  findForUser(
    @CurrentUser() user: RequestUser,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.notificationsService.findForUser(user, page, pageSize);
  }

  @Get('notifications/unread-count')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO, RoleName.DOMICILIARIO)
  getUnreadCount(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getUnreadCount(user);
  }

  @Post('notifications/:id/read')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO, RoleName.DOMICILIARIO)
  markAsRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.markAsRead(id, user);
  }

  @Post('notifications/read-all')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO, RoleName.DOMICILIARIO)
  markAllAsRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllAsRead(user);
  }

  @Delete('notifications/:id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO, RoleName.DOMICILIARIO)
  delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.delete(id, user);
  }

  @Get('notifications/preferences')
  @Roles(RoleName.ADMIN_NEGOCIO)
  getPreferences(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getPreferences(user.tenantId!, user.id);
  }

  @Patch('notifications/preferences')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updatePreferences(@CurrentUser() user: RequestUser, @Body() dto: BulkUpdatePreferencesDto) {
    return this.notificationsService.bulkUpdatePreferences(user.tenantId!, user.id, dto);
  }

  @Get('notifications/templates')
  @Roles(RoleName.ADMIN_NEGOCIO)
  getTemplates(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getTemplates(user.tenantId!);
  }

  @Post('notifications/templates')
  @Roles(RoleName.ADMIN_NEGOCIO)
  createTemplate(@CurrentUser() user: RequestUser, @Body() dto: CreateNotificationTemplateDto) {
    return this.notificationsService.createTemplate(user.tenantId!, dto);
  }

  @Patch('notifications/templates/:id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  updateTemplate(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateNotificationTemplateDto) {
    return this.notificationsService.updateTemplate(user.tenantId!, id, dto);
  }
}
