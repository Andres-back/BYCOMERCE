import { Injectable } from '@nestjs/common';
import { Prisma } from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';

export interface AuditLogInput {
  tenantId?: string | null;
  usuarioId?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        usuarioId: input.usuarioId ?? null,
        accion: input.accion,
        entidad: input.entidad,
        entidadId: input.entidadId ?? null,
        oldValue: input.oldValue ?? Prisma.JsonNull,
        newValue: input.newValue ?? Prisma.JsonNull,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  }
}
