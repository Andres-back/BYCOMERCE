import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EstadoGeneral, SubscriptionStatus, User } from '../../database/prisma-client';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    tenantId: string | null;
    isSuperAdmin: boolean;
  };
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthTokens> {
    const user = await this.findLoginUser(dto);
    if (!user) {
      await this.recordLoginAttempt(dto.email, null, false, 'USER_NOT_FOUND', ip, userAgent);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.estado !== EstadoGeneral.ACTIVO) {
      await this.recordLoginAttempt(dto.email, user.id, false, 'USER_INACTIVE', ip, userAgent);
      throw new ForbiddenException('Usuario inactivo');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.recordLoginAttempt(dto.email, user.id, false, 'USER_LOCKED', ip, userAgent);
      throw new ForbiddenException('Cuenta bloqueada temporalmente');
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
      });
      await this.recordLoginAttempt(dto.email, user.id, false, 'BAD_PASSWORD', ip, userAgent);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.tenantId && user.tenant?.estado !== EstadoGeneral.ACTIVO) {
      await this.recordLoginAttempt(dto.email, user.id, false, 'TENANT_INACTIVE', ip, userAgent);
      throw new ForbiddenException('Tenant inactivo');
    }

    if (user.tenantId && !user.isSuperAdmin) {
      await this.ensureSubscriptionAllowsLogin(user.tenantId, dto.email, user.id, ip, userAgent);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        ultimoAcceso: new Date(),
      },
    });

    await this.recordLoginAttempt(dto.email, user.id, true, null, ip, userAgent);

    await this.audit.log({
      tenantId: user.tenantId,
      usuarioId: user.id,
      accion: 'AUTH_LOGIN_SUCCESS',
      entidad: 'users',
      entidadId: user.id,
      ip,
      userAgent,
    });

    return this.issueTokens(user, ip, userAgent);
  }

  private async findLoginUser(dto: LoginDto) {
    if (dto.tenantSlug) {
      return this.prisma.user.findFirst({
        where: {
          email: dto.email.toLowerCase(),
          tenant: { slug: dto.tenantSlug },
        },
        include: { tenant: true },
      });
    }

    return this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
      include: { tenant: true },
      orderBy: { isSuperAdmin: 'desc' },
    });
  }

  private async issueTokens(user: User, ip?: string, userAgent?: string): Promise<AuthTokens> {
    const accessTtl = this.config.get<number>('jwt.accessTtl') ?? 900;
    const refreshTtl = this.config.get<number>('jwt.refreshTtl') ?? 604800;
    const jti = randomUUID();
    const refreshToken = `${randomUUID()}.${randomBytes(48).toString('hex')}`;
    const refreshHash = this.hash(refreshToken);

    const payload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
      impersonatedBy: null,
      jti,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: accessTtl,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash: refreshHash,
        jti,
        userAgent,
        ip,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin,
      },
      expiresIn: accessTtl,
    };
  }

  private async recordLoginAttempt(
    email: string,
    userId: string | null,
    success: boolean,
    failureReason?: string | null,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        email: email.toLowerCase(),
        userId,
        success,
        failureReason,
        ip,
        userAgent,
      },
    });
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  async impersonateIssue(
    superAdmin: { id: string; email: string; rol: string; tenantId: string; isSuperAdmin: boolean },
    targetUser: {
      id: string;
      email: string;
      nombre: string;
      rol: string;
      tenantId: string | null;
      isSuperAdmin: boolean;
    },
  ): Promise<AuthTokens> {
    const accessTtl = this.config.get<number>('jwt.accessTtl') ?? 900;
    const jti = randomUUID();

    const payload = {
      sub: targetUser.id,
      email: targetUser.email,
      rol: targetUser.rol,
      tenantId: targetUser.tenantId,
      isSuperAdmin: targetUser.isSuperAdmin,
      impersonatedBy: superAdmin.id,
      jti,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: accessTtl,
    });

    await this.audit.log({
      tenantId: targetUser.tenantId,
      usuarioId: superAdmin.id,
      accion: 'SUPERADMIN_IMPERSONATE',
      entidad: 'users',
      entidadId: targetUser.id,
      metadata: { impersonatedBy: superAdmin.email, targetUser: targetUser.email },
    });

    return {
      accessToken,
      refreshToken: '',
      user: {
        id: targetUser.id,
        nombre: targetUser.nombre,
        email: targetUser.email,
        rol: targetUser.rol,
        tenantId: targetUser.tenantId,
        isSuperAdmin: targetUser.isSuperAdmin,
      },
      expiresIn: accessTtl,
    };
  }

  private async ensureSubscriptionAllowsLogin(
    tenantId: string,
    email: string,
    userId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: [{ fechaFin: 'desc' }, { createdAt: 'desc' }],
    });

    const canOperate =
      subscription &&
      (subscription.estado === SubscriptionStatus.ACTIVA ||
        subscription.estado === SubscriptionStatus.EN_PRUEBA) &&
      subscription.fechaFin >= new Date();

    if (!canOperate) {
      await this.recordLoginAttempt(email, userId, false, 'SUBSCRIPTION_INACTIVE', ip, userAgent);
      throw new ForbiddenException('Suscripcion inactiva o vencida');
    }
  }
}
