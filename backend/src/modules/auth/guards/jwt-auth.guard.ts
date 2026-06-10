import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '../../../database/prisma-client';
import { Request } from 'express';
import { RequestUser } from '../../../common/types/request-user';
import { TenantContextService } from '../../../database/tenant-context.service';

type JwtPayload = {
  sub: string;
  email: string;
  rol: RoleName;
  tenantId: string | null;
  isSuperAdmin: boolean;
  impersonatedBy: string | null;
};

type RequestWithUser = Request & { user?: RequestUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.header('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }

    const token = authHeader.slice('Bearer '.length);
    const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.config.get<string>('jwt.accessSecret'),
    });

    request.user = {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
      tenantId: payload.tenantId,
      isSuperAdmin: payload.isSuperAdmin,
    };

    this.tenantContext.set({
      tenantId: payload.tenantId,
      userId: payload.sub,
      isSuperAdmin: payload.isSuperAdmin,
      isImpersonating: Boolean(payload.impersonatedBy),
    });

    return true;
  }
}
