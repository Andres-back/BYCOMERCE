import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoGeneral } from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string) {
    return this.prisma.tenantBranch.findMany({
      where: { tenantId },
      orderBy: { esPrincipal: 'desc' },
    });
  }

  async get(tenantId: string, id: string) {
    const branch = await this.prisma.tenantBranch.findFirst({ where: { id, tenantId } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    return branch;
  }

  async create(tenantId: string, data: any, usuarioId: string) {
    if (data.esPrincipal) {
      await this.prisma.tenantBranch.updateMany({
        where: { tenantId, esPrincipal: true },
        data: { esPrincipal: false },
      });
    }
    const branch = await this.prisma.tenantBranch.create({ data: { tenantId, ...data } });
    await this.audit.log({ tenantId, usuarioId, accion: 'SUCURSAL_CREADA', entidad: 'tenant_branches', entidadId: branch.id });
    return branch;
  }

  async update(tenantId: string, id: string, data: any, usuarioId: string) {
    const branch = await this.get(tenantId, id);
    if (data.esPrincipal && !branch.esPrincipal) {
      await this.prisma.tenantBranch.updateMany({
        where: { tenantId, esPrincipal: true },
        data: { esPrincipal: false },
      });
    }
    const updated = await this.prisma.tenantBranch.update({ where: { id }, data });
    await this.audit.log({ tenantId, usuarioId, accion: 'SUCURSAL_ACTUALIZADA', entidad: 'tenant_branches', entidadId: id });
    return updated;
  }

  async deactivate(tenantId: string, id: string, usuarioId: string) {
    const branch = await this.get(tenantId, id);
    if (branch.esPrincipal) throw new BadRequestException('No se puede desactivar la sucursal principal');
    const updated = await this.prisma.tenantBranch.update({ where: { id }, data: { estado: EstadoGeneral.INACTIVO } });
    await this.audit.log({ tenantId, usuarioId, accion: 'SUCURSAL_DESACTIVADA', entidad: 'tenant_branches', entidadId: id });
    return updated;
  }

  async activate(tenantId: string, id: string, usuarioId: string) {
    await this.get(tenantId, id);
    const updated = await this.prisma.tenantBranch.update({ where: { id }, data: { estado: EstadoGeneral.ACTIVO } });
    await this.audit.log({ tenantId, usuarioId, accion: 'SUCURSAL_ACTIVADA', entidad: 'tenant_branches', entidadId: id });
    return updated;
  }
}
