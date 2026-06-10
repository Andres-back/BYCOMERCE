import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CashMovementType,
  CashRegisterStatus,
  Prisma,
  RoleName,
} from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';
import { RequestUser } from '../../common/types/request-user';
import { AuditService } from '../audit/audit.service';
import { CloseCashRegisterDto, OpenCashRegisterDto } from './dto/cash-register-action.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CreateExpenseDto, ExpenseQueryDto, UpdateExpenseDto } from './dto/expense.dto';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  listCashRegisters(user: RequestUser) {
    return this.prisma.cashRegister.findMany({
      where: { tenantId: this.requireTenant(user) },
      include: { movements: { orderBy: { fecha: 'desc' }, take: 20 } },
      orderBy: { fechaApertura: 'desc' },
      take: 50,
    });
  }

  async getCurrentCashRegister(user: RequestUser) {
    const tenantId = this.requireTenant(user);
    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: { tenantId, usuarioId: user.id, estado: CashRegisterStatus.ABIERTA },
      include: { movements: { orderBy: { fecha: 'desc' } } },
      orderBy: { fechaApertura: 'desc' },
    });
    if (!cashRegister) return null;
    return this.withCashSummary(cashRegister);
  }

  async getCashRegister(user: RequestUser, id: string) {
    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: { id, tenantId: this.requireTenant(user) },
      include: { movements: { orderBy: { fecha: 'desc' } } },
    });
    if (!cashRegister) throw new NotFoundException('Caja no encontrada');
    return this.withCashSummary(cashRegister);
  }

  async openCashRegister(user: RequestUser, dto: OpenCashRegisterDto) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.cashRegister.findFirst({
      where: { tenantId, usuarioId: user.id, estado: CashRegisterStatus.ABIERTA },
    });
    if (existing) throw new ConflictException('Ya existe una caja abierta para este usuario');

    const cashRegister = await this.prisma.$transaction(async (tx) => {
      const created = await tx.cashRegister.create({
        data: {
          tenantId,
          usuarioId: user.id,
          fechaApertura: new Date(),
          saldoInicial: dto.saldoInicial,
          estado: CashRegisterStatus.ABIERTA,
        },
      });

      await tx.cashMovement.create({
        data: {
          tenantId,
          cashRegisterId: created.id,
          tipo: CashMovementType.APERTURA,
          monto: dto.saldoInicial,
          descripcion: 'Apertura de caja',
          usuarioId: user.id,
        },
      });

      return created;
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'CAJA_ABIERTA',
      entidad: 'cash_registers',
      entidadId: cashRegister.id,
      newValue: cashRegister,
    });

    return this.getCashRegister(user, cashRegister.id);
  }

  async closeCashRegister(user: RequestUser, id: string, dto: CloseCashRegisterDto) {
    const tenantId = this.requireTenant(user);
    const current = await this.prisma.cashRegister.findFirst({
      where: { id, tenantId, estado: CashRegisterStatus.ABIERTA },
      include: { movements: true },
    });
    if (!current) throw new NotFoundException('Caja abierta no encontrada');

    const expected = this.computeExpectedBalance(current.movements);
    const difference = dto.saldoFinal - expected;

    const updated = await this.prisma.$transaction(async (tx) => {
      const closed = await tx.cashRegister.update({
        where: { id: current.id },
        data: {
          fechaCierre: new Date(),
          saldoFinal: dto.saldoFinal,
          estado: CashRegisterStatus.CERRADA,
        },
      });

      await tx.cashMovement.create({
        data: {
          tenantId,
          cashRegisterId: current.id,
          tipo: CashMovementType.CIERRE,
          monto: dto.saldoFinal,
          descripcion: dto.observacion ?? `Cierre de caja. Diferencia ${difference}`,
          usuarioId: user.id,
        },
      });

      return closed;
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'CAJA_CERRADA',
      entidad: 'cash_registers',
      entidadId: current.id,
      oldValue: current,
      newValue: { ...updated, saldoEsperado: expected, diferencia: difference },
    });

    const closed = await this.getCashRegister(user, current.id);
    return { ...closed, saldoEsperado: expected, diferencia: difference };
  }

  listCashMovements(user: RequestUser, cashRegisterId: string) {
    const tenantId = this.requireTenant(user);
    return this.prisma.cashMovement.findMany({
      where: { tenantId, cashRegisterId },
      orderBy: { fecha: 'desc' },
      take: 100,
    });
  }

  async createCashMovement(user: RequestUser, cashRegisterId: string, dto: CreateCashMovementDto) {
    if (
      dto.tipo !== CashMovementType.INGRESO_MANUAL &&
      dto.tipo !== CashMovementType.AJUSTE &&
      dto.tipo !== CashMovementType.RETIRO
    ) {
      throw new BadRequestException('Tipo de movimiento no permitido manualmente');
    }

    const tenantId = this.requireTenant(user);
    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: { id: cashRegisterId, tenantId, estado: CashRegisterStatus.ABIERTA },
    });
    if (!cashRegister) throw new NotFoundException('Caja abierta no encontrada');

    const movement = await this.prisma.cashMovement.create({
      data: {
        tenantId,
        cashRegisterId,
        tipo: dto.tipo,
        monto: dto.monto,
        descripcion: dto.descripcion,
        usuarioId: user.id,
      },
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'CAJA_MOVIMIENTO_REGISTRADO',
      entidad: 'cash_movements',
      entidadId: movement.id,
      newValue: movement,
    });

    return movement;
  }

  listExpenses(user: RequestUser, query: ExpenseQueryDto) {
    const tenantId = this.requireTenant(user);
    const where = {
      tenantId,
      ...(query.q?.trim()
        ? {
            OR: [
              { categoria: { contains: query.q.trim(), mode: 'insensitive' as const } },
              { descripcion: { contains: query.q.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.categoria ? { categoria: query.categoria } : {}),
      ...(query.from || query.to
        ? {
            fecha: {
              ...(query.from ? { gte: this.startOfDay(new Date(query.from)) } : {}),
              ...(query.to ? { lte: this.endOfDay(new Date(query.to)) } : {}),
            },
          }
        : {}),
    };

    return this.prisma.expense.findMany({
      where,
      orderBy: { fecha: 'desc' },
      take: 100,
    });
  }

  async getExpense(user: RequestUser, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId: this.requireTenant(user) },
    });
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    return expense;
  }

  async createExpense(user: RequestUser, dto: CreateExpenseDto) {
    const tenantId = this.requireTenant(user);

    const result = await this.prisma.$transaction(async (tx) => {
      const cashRegister = await this.findOrOpenCashRegister(tx, tenantId, user.id);
      const expense = await tx.expense.create({
        data: {
          tenantId,
          usuarioId: user.id,
          categoria: dto.categoria,
          descripcion: dto.descripcion,
          valor: dto.valor,
          comprobanteUrl: dto.comprobanteUrl,
          fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        },
      });

      const movement = await tx.cashMovement.create({
        data: {
          tenantId,
          cashRegisterId: cashRegister.id,
          tipo: CashMovementType.GASTO,
          monto: dto.valor,
          descripcion: `${dto.categoria}: ${dto.descripcion}`,
          referenciaId: expense.id,
          referenciaTipo: 'EXPENSE',
          usuarioId: user.id,
        },
      });

      return { expense, movement };
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'GASTO_REGISTRADO',
      entidad: 'expenses',
      entidadId: result.expense.id,
      newValue: result,
    });

    return result.expense;
  }

  async updateExpense(user: RequestUser, id: string, dto: UpdateExpenseDto) {
    const tenantId = this.requireTenant(user);
    const current = await this.prisma.expense.findFirst({ where: { id, tenantId } });
    if (!current) throw new NotFoundException('Gasto no encontrado');

    const movement = await this.prisma.cashMovement.findFirst({
      where: { tenantId, referenciaId: current.id, referenciaTipo: 'EXPENSE' },
      include: { cashRegister: true },
    });
    if (movement && movement.cashRegister.estado === CashRegisterStatus.CERRADA) {
      throw new ConflictException('No se puede editar un gasto de una caja cerrada');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.update({
        where: { id: current.id },
        data: {
          categoria: dto.categoria,
          descripcion: dto.descripcion,
          valor: dto.valor,
          comprobanteUrl: dto.comprobanteUrl,
        },
      });

      await tx.cashMovement.updateMany({
        where: {
          tenantId,
          referenciaId: current.id,
          referenciaTipo: 'EXPENSE',
          cashRegister: { estado: CashRegisterStatus.ABIERTA },
        },
        data: {
          monto: dto.valor,
          descripcion:
            dto.categoria || dto.descripcion
              ? `${dto.categoria ?? expense.categoria}: ${dto.descripcion ?? expense.descripcion}`
              : undefined,
        },
      });

      return expense;
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'GASTO_ACTUALIZADO',
      entidad: 'expenses',
      entidadId: updated.id,
      oldValue: current,
      newValue: updated,
    });

    return updated;
  }

  async deleteExpense(user: RequestUser, id: string) {
    const tenantId = this.requireTenant(user);
    const expense = await this.prisma.expense.findFirst({ where: { id, tenantId } });
    if (!expense) throw new NotFoundException('Gasto no encontrado');

    const movement = await this.prisma.cashMovement.findFirst({
      where: { tenantId, referenciaId: id, referenciaTipo: 'EXPENSE' },
      include: { cashRegister: true },
    });
    if (movement && movement.cashRegister.estado === CashRegisterStatus.CERRADA) {
      throw new ConflictException('No se puede eliminar un gasto de una caja cerrada');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cashMovement.deleteMany({ where: { tenantId, referenciaId: id, referenciaTipo: 'EXPENSE' } });
      await tx.expense.delete({ where: { id: expense.id } });
    });

    await this.auditService.log({
      tenantId,
      usuarioId: user.id,
      accion: 'GASTO_ELIMINADO',
      entidad: 'expenses',
      entidadId: expense.id,
      oldValue: expense,
    });

    return { id: expense.id, deleted: true };
  }

  private async findOrOpenCashRegister(tx: Prisma.TransactionClient, tenantId: string, userId: string) {
    const existing = await tx.cashRegister.findFirst({
      where: { tenantId, usuarioId: userId, estado: CashRegisterStatus.ABIERTA },
      orderBy: { fechaApertura: 'desc' },
    });
    if (existing) return existing;

    const cashRegister = await tx.cashRegister.create({
      data: {
        tenantId,
        usuarioId: userId,
        fechaApertura: new Date(),
        saldoInicial: 0,
        estado: CashRegisterStatus.ABIERTA,
      },
    });

    await tx.cashMovement.create({
      data: {
        tenantId,
        cashRegisterId: cashRegister.id,
        tipo: CashMovementType.APERTURA,
        monto: 0,
        descripcion: 'Apertura automatica por gasto MVP',
        usuarioId: userId,
      },
    });

    return cashRegister;
  }

  private withCashSummary<T extends { movements: Array<{ tipo: CashMovementType; monto: number }> }>(cashRegister: T) {
    const saldoEsperado = this.computeExpectedBalance(cashRegister.movements);
    const ingresos = cashRegister.movements.reduce((sum, movement) => {
      const signed = this.signedCashAmount(movement.tipo, movement.monto);
      return signed > 0 ? sum + signed : sum;
    }, 0);
    const egresos = cashRegister.movements.reduce((sum, movement) => {
      const signed = this.signedCashAmount(movement.tipo, movement.monto);
      return signed < 0 ? sum + Math.abs(signed) : sum;
    }, 0);

    return { ...cashRegister, saldoEsperado, ingresos, egresos };
  }

  private computeExpectedBalance(movements: Array<{ tipo: CashMovementType; monto: number }>) {
    return movements.reduce((sum, movement) => sum + this.signedCashAmount(movement.tipo, movement.monto), 0);
  }

  private signedCashAmount(tipo: CashMovementType, monto: number) {
    if (tipo === CashMovementType.GASTO || tipo === CashMovementType.RETIRO || tipo === CashMovementType.DEVOLUCION) {
      return -monto;
    }
    if (tipo === CashMovementType.CIERRE) {
      return 0;
    }
    return monto;
  }

  private requireTenant(user: RequestUser): string {
    if (!user.tenantId || user.rol === RoleName.SUPER_ADMIN) {
      throw new NotFoundException('Tenant no disponible para esta operacion');
    }
    return user.tenantId;
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }
}
