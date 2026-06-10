import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getProgram(tenantId: string) {
    return this.prisma.loyaltyProgram.findFirst({
      where: { tenantId },
      include: { tiers: { orderBy: { nivel: 'asc' } }, rules: true },
    });
  }

  async updateProgram(tenantId: string, data: any, usuarioId: string) {
    const program = await this.prisma.loyaltyProgram.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
    await this.audit.log({ tenantId, usuarioId, accion: 'PROGRAMA_FIDELIZACION_ACTUALIZADO', entidad: 'loyalty_programs', entidadId: program.id });
    return program;
  }

  async getTiers(tenantId: string) {
    return this.prisma.loyaltyTier.findMany({
      where: { program: { tenantId } },
      orderBy: { nivel: 'asc' },
    });
  }

  async createTier(tenantId: string, data: any, usuarioId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({ where: { tenantId } });
    if (!program) throw new NotFoundException('Configure el programa primero');
    const tier = await this.prisma.loyaltyTier.create({ data: { programId: program.id, ...data } });
    await this.audit.log({ tenantId, usuarioId, accion: 'NIVEL_FIDELIZACION_CREADO', entidad: 'loyalty_tiers', entidadId: tier.id });
    return tier;
  }

  async updateTier(tenantId: string, id: string, data: any, usuarioId: string) {
    const tier = await this.prisma.loyaltyTier.findFirst({ where: { id, program: { tenantId } } });
    if (!tier) throw new NotFoundException('Nivel no encontrado');
    const updated = await this.prisma.loyaltyTier.update({ where: { id }, data });
    await this.audit.log({ tenantId, usuarioId, accion: 'NIVEL_FIDELIZACION_ACTUALIZADO', entidad: 'loyalty_tiers', entidadId: id });
    return updated;
  }

  async getRewards(tenantId: string) {
    return this.prisma.loyaltyReward.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createReward(tenantId: string, data: any, usuarioId: string) {
    const reward = await this.prisma.loyaltyReward.create({ data: { tenantId, ...data } });
    await this.audit.log({ tenantId, usuarioId, accion: 'RECOMPENSA_CREADA', entidad: 'loyalty_rewards', entidadId: reward.id });
    return reward;
  }

  async updateReward(tenantId: string, id: string, data: any, usuarioId: string) {
    const reward = await this.prisma.loyaltyReward.findFirst({ where: { id, tenantId } });
    if (!reward) throw new NotFoundException('Recompensa no encontrada');
    const updated = await this.prisma.loyaltyReward.update({ where: { id }, data });
    await this.audit.log({ tenantId, usuarioId, accion: 'RECOMPENSA_ACTUALIZADA', entidad: 'loyalty_rewards', entidadId: id });
    return updated;
  }

  async getCustomerPoints(tenantId: string, customerId: string) {
    const points = await this.prisma.loyaltyPoint.aggregate({
      where: { tenantId, customerId },
      _sum: { puntos: true },
    });
    const tier = await this.prisma.loyaltyTier.findFirst({
      where: { program: { tenantId }, puntosMinimos: { lte: points._sum.puntos ?? 0 } },
      orderBy: { nivel: 'desc' },
    });
    return { totalPuntos: points._sum.puntos ?? 0, tier };
  }

  async getCustomerPointHistory(tenantId: string, customerId: string) {
    return this.prisma.loyaltyPoint.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
