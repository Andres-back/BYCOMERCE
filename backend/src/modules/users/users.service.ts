import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import {
  EstadoGeneral,
  Prisma,
  RefreshRevokedReason,
  RoleName,
} from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';
import { RequestUser } from '../../common/types/request-user';
import { AuditService } from '../audit/audit.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

const TENANT_ROLES: RoleName[] = [
  RoleName.ADMIN_NEGOCIO,
  RoleName.SUPERVISOR,
  RoleName.CAJERO,
  RoleName.DOMICILIARIO,
];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  listUsers(user: RequestUser, query: UserQueryDto) {
    const tenantId = this.requireTenant(user);
    const q = query.q?.trim();

    return this.prisma.user.findMany({
      where: {
        tenantId,
        isSuperAdmin: false,
        ...(query.rol ? { rol: query.rol } : {}),
        ...(query.estado ? { estado: query.estado } : {}),
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { email: { contains: q.toLowerCase(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: this.safeUserSelect(),
      orderBy: [{ estado: 'asc' }, { nombre: 'asc' }],
      take: 100,
    });
  }

  async getUser(user: RequestUser, id: string) {
    const found = await this.prisma.user.findFirst({
      where: { id, tenantId: this.requireTenant(user), isSuperAdmin: false },
      select: this.safeUserSelect(),
    });
    if (!found) throw new NotFoundException('Usuario no encontrado');
    return found;
  }

  async inviteUser(user: RequestUser, dto: InviteUserDto) {
    const tenantId = this.requireTenant(user);
    this.assertTenantRole(dto.rol);
    await this.assertUserLimitAvailable(tenantId);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email } });
    if (existing) throw new ConflictException('Ya existe un usuario con este email');

    const temporaryPassword = dto.temporaryPassword ?? this.generateTemporaryPassword();
    const passwordHash = await this.hashPassword(temporaryPassword);

    const created = await this.prisma.user.create({
      data: {
        tenantId,
        nombre: dto.nombre.trim(),
        email,
        rol: dto.rol,
        estado: EstadoGeneral.ACTIVO,
        passwordHash,
        mustChangePassword: true,
        lastPasswordChange: new Date(),
      },
      select: this.safeUserSelect(),
    });

    await this.audit.log({
      tenantId,
      usuarioId: user.id,
      accion: 'USUARIO_INVITADO',
      entidad: 'users',
      entidadId: created.id,
      newValue: created,
      metadata: { mode: 'temporary_password_mvp' },
    });

    return { user: created, temporaryPassword };
  }

  async updateUser(user: RequestUser, id: string, dto: UpdateUserDto) {
    const tenantId = this.requireTenant(user);
    const current = await this.prisma.user.findFirst({
      where: { id, tenantId, isSuperAdmin: false },
      select: this.safeUserSelect(),
    });
    if (!current) throw new NotFoundException('Usuario no encontrado');
    if (dto.rol) this.assertTenantRole(dto.rol);

    const nextEmail = dto.email?.trim().toLowerCase();
    if (nextEmail && nextEmail !== current.email) {
      const duplicated = await this.prisma.user.findFirst({ where: { tenantId, email: nextEmail } });
      if (duplicated) throw new ConflictException('Ya existe un usuario con este email');
    }

    const shouldRevokeSessions = Boolean(dto.rol && dto.rol !== current.rol) || Boolean(dto.newPassword);
    const passwordHash = dto.newPassword ? await this.hashPassword(dto.newPassword) : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.user.update({
        where: { id: current.id },
        data: {
          nombre: dto.nombre?.trim(),
          email: nextEmail,
          rol: dto.rol,
          passwordHash,
          mustChangePassword: dto.newPassword ? true : undefined,
          lastPasswordChange: dto.newPassword ? new Date() : undefined,
        },
        select: this.safeUserSelect(),
      });

      if (shouldRevokeSessions) {
        await tx.refreshToken.updateMany({
          where: { userId: current.id, revokedAt: null },
          data: {
            revokedAt: new Date(),
            revokedReason: RefreshRevokedReason.ADMIN_REVOKE,
          },
        });
      }

      return next;
    });

    await this.audit.log({
      tenantId,
      usuarioId: user.id,
      accion: 'USUARIO_ACTUALIZADO',
      entidad: 'users',
      entidadId: current.id,
      oldValue: current,
      newValue: updated,
      metadata: shouldRevokeSessions ? { sessionsRevoked: true } : null,
    });

    return updated;
  }

  async deactivateUser(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    if (id === user.id) throw new BadRequestException('No puedes desactivar tu propio usuario');

    const current = await this.prisma.user.findFirst({
      where: { id, tenantId, isSuperAdmin: false },
      select: this.safeUserSelect(),
    });
    if (!current) throw new NotFoundException('Usuario no encontrado');
    if (current.rol === RoleName.ADMIN_NEGOCIO) {
      await this.assertAnotherActiveAdminExists(tenantId, current.id);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.user.update({
        where: { id: current.id },
        data: { estado: EstadoGeneral.INACTIVO },
        select: this.safeUserSelect(),
      });
      await tx.refreshToken.updateMany({
        where: { userId: current.id, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedReason: RefreshRevokedReason.ADMIN_REVOKE,
        },
      });
      return next;
    });

    await this.audit.log({
      tenantId,
      usuarioId: user.id,
      accion: 'USUARIO_DESACTIVADO',
      entidad: 'users',
      entidadId: current.id,
      oldValue: current,
      newValue: updated,
      metadata: { sessionsRevoked: true },
    });

    return updated;
  }

  async activateUser(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    const current = await this.prisma.user.findFirst({
      where: { id, tenantId, isSuperAdmin: false },
      select: this.safeUserSelect(),
    });
    if (!current) throw new NotFoundException('Usuario no encontrado');
    if (current.estado !== EstadoGeneral.ACTIVO) {
      await this.assertUserLimitAvailable(tenantId);
    }

    const updated = await this.prisma.user.update({
      where: { id: current.id },
      data: { estado: EstadoGeneral.ACTIVO },
      select: this.safeUserSelect(),
    });

    await this.audit.log({
      tenantId,
      usuarioId: user.id,
      accion: 'USUARIO_ACTIVADO',
      entidad: 'users',
      entidadId: current.id,
      oldValue: current,
      newValue: updated,
    });

    return updated;
  }

  async resendInvitation(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    const current = await this.prisma.user.findFirst({
      where: { id, tenantId, isSuperAdmin: false },
      select: this.safeUserSelect(),
    });
    if (!current) throw new NotFoundException('Usuario no encontrado');

    const temporaryPassword = this.generateTemporaryPassword();
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.user.update({
        where: { id: current.id },
        data: {
          passwordHash: await this.hashPassword(temporaryPassword),
          estado: EstadoGeneral.ACTIVO,
          mustChangePassword: true,
          lastPasswordChange: new Date(),
        },
        select: this.safeUserSelect(),
      });
      await tx.refreshToken.updateMany({
        where: { userId: current.id, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedReason: RefreshRevokedReason.ADMIN_REVOKE,
        },
      });
      return next;
    });

    await this.audit.log({
      tenantId,
      usuarioId: user.id,
      accion: 'USUARIO_INVITACION_REENVIADA',
      entidad: 'users',
      entidadId: current.id,
      oldValue: current,
      newValue: updated,
      metadata: { mode: 'temporary_password_mvp', sessionsRevoked: true },
    });

    return { user: updated, temporaryPassword };
  }

  private requireTenant(user: RequestUser): string {
    if (!user.tenantId || user.rol === RoleName.SUPER_ADMIN) {
      throw new NotFoundException('Tenant no disponible para esta operacion');
    }
    return user.tenantId;
  }

  private assertTenantRole(rol: RoleName) {
    if (!TENANT_ROLES.includes(rol)) {
      throw new BadRequestException('Rol no permitido para usuarios del tenant');
    }
  }

  private async assertUserLimitAvailable(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
      include: { plan: true },
    });
    const limit = tenant?.plan?.limiteUsuarios;
    if (!limit) return;

    const activeUsers = await this.prisma.user.count({
      where: {
        tenantId,
        estado: EstadoGeneral.ACTIVO,
        isSuperAdmin: false,
      },
    });
    if (activeUsers >= limit) {
      throw new UnprocessableEntityException('Limite de usuarios activos alcanzado para el plan');
    }
  }

  private async assertAnotherActiveAdminExists(tenantId: string, excludedUserId: string) {
    const count = await this.prisma.user.count({
      where: {
        tenantId,
        id: { not: excludedUserId },
        rol: RoleName.ADMIN_NEGOCIO,
        estado: EstadoGeneral.ACTIVO,
        isSuperAdmin: false,
      },
    });
    if (count === 0) {
      throw new ConflictException('Debe existir al menos otro administrador activo');
    }
  }

  private hashPassword(password: string) {
    const cost = this.config.get<number>('security.bcryptCost') ?? 12;
    return bcrypt.hash(password, cost);
  }

  private generateTemporaryPassword() {
    const suffix = randomBytes(5).toString('hex');
    return `Mocoa${suffix}7`;
  }

  private safeUserSelect() {
    return {
      id: true,
      tenantId: true,
      nombre: true,
      email: true,
      rol: true,
      estado: true,
      ultimoAcceso: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.UserSelect;
  }
}
