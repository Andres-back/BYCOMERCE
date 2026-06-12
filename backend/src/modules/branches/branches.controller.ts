import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/create-branch.dto';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  list(@CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.branchesService.list(user.tenantId);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.branchesService.get(user.tenantId, id);
  }

  @Post()
  @Roles(RoleName.ADMIN_NEGOCIO)
  create(@Body() dto: CreateBranchDto, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.branchesService.create(user.tenantId, dto, user.id);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN_NEGOCIO)
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.branchesService.update(user.tenantId, id, dto, user.id);
  }

  @Post(':id/deactivate')
  @Roles(RoleName.ADMIN_NEGOCIO)
  deactivate(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.branchesService.deactivate(user.tenantId, id, user.id);
  }

  @Post(':id/activate')
  @Roles(RoleName.ADMIN_NEGOCIO)
  activate(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    if (!user.tenantId) throw new NotFoundException('Tenant no disponible para esta operacion');
    return this.branchesService.activate(user.tenantId, id, user.id);
  }
}
