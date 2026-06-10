import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoGeneral } from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  listActivePlans() {
    return this.prisma.plan.findMany({
      where: { estado: EstadoGeneral.ACTIVO },
      orderBy: { precio: 'asc' },
    });
  }

  async getPlan(id: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id, estado: EstadoGeneral.ACTIVO },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }
}
