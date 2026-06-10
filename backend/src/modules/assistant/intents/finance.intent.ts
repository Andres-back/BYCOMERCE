import { PrismaService } from '../../../database/prisma.service';
import { IntentDefinition } from './intent.types';
import { formatCentavosToCop, formatNumber } from './helpers';
import { CashRegisterStatus, EstadoGeneral } from '../../../database/prisma-client';

export function createFinanceIntents(prisma: PrismaService): IntentDefinition[] {
  return [
    {
      name: 'finance.cash_status',
      description: 'Estado actual de la caja',
      examples: [
        'estado de mi caja',
        'cómo va la caja',
        'tengo caja abierta',
        'caja abierta',
      ],
      keywords: ['caja', 'estado', 'abierta', 'cerrada', 'como', 'cómo'],
      async handle(_q, _e, ctx) {
        const registerRaw = await prisma.cashRegister.findFirst({
          where: { tenantId: ctx.tenantId, estado: CashRegisterStatus.ABIERTA },
          orderBy: { fechaApertura: 'desc' },
        });
        if (!registerRaw) {
          return {
            answer: '🔴 No tienes una caja abierta. Ábrela desde el módulo de Caja para empezar a registrar movimientos.',
            navigate: [{ label: 'Ir a Caja', href: '/admin/cash' }],
          };
        }
        const movements = await prisma.cashMovement.findMany({
          where: { cashRegisterId: registerRaw.id },
        });
        const user = await prisma.user.findUnique({ where: { id: registerRaw.usuarioId }, select: { nombre: true } });
        const totalIngresos = movements
          .filter((m) => m.tipo === 'VENTA' || m.tipo === 'INGRESO_MANUAL' || m.tipo === 'APERTURA')
          .reduce((s, m) => s + m.monto, 0);
        const totalGastos = movements
          .filter((m) => m.tipo === 'GASTO' || m.tipo === 'RETIRO' || m.tipo === 'DEVOLUCION')
          .reduce((s, m) => s + m.monto, 0);
        const saldoActual = registerRaw.saldoInicial + totalIngresos - totalGastos;
        return {
          answer: `🟢 **Caja abierta** desde ${new Date(registerRaw.fechaApertura).toLocaleString('es-CO')}.\n\n` +
            `• Saldo inicial: ${formatCentavosToCop(registerRaw.saldoInicial)}\n` +
            `• Ingresos: ${formatCentavosToCop(totalIngresos)}\n` +
            `• Gastos/retiros: ${formatCentavosToCop(totalGastos)}\n` +
            `• **Saldo actual: ${formatCentavosToCop(saldoActual)}**\n` +
            `• Abierta por: ${user?.nombre ?? 'N/D'}\n` +
            `• Movimientos: ${formatNumber(movements.length)}`,
          cards: [
            { type: 'stat', title: 'Saldo en caja', value: formatCentavosToCop(saldoActual) },
            { type: 'stat', title: 'Ingresos', value: formatCentavosToCop(totalIngresos) },
            { type: 'stat', title: 'Gastos', value: formatCentavosToCop(totalGastos) },
          ],
          navigate: [{ label: 'Ir a Caja', href: '/admin/cash' }],
        };
      },
    },
    {
      name: 'finance.expenses_today',
      description: 'Gastos del día',
      examples: [
        'gastos de hoy',
        'cuánto he gastado hoy',
        'egresos del día',
        'gastos del día',
      ],
      keywords: ['gastos', 'gastado', 'egresos', 'hoy', 'dia', 'día'],
      async handle(_q, _e, ctx) {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        const [agg, items] = await Promise.all([
          prisma.expense.aggregate({ _sum: { valor: true }, where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end } } }),
          prisma.expense.findMany({
            where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end } },
            orderBy: { valor: 'desc' },
            take: 5,
            select: { categoria: true, descripcion: true, valor: true },
          }),
        ]);
        const total = agg._sum.valor ?? 0;
        if (total === 0) {
          return { answer: 'No tienes gastos registrados hoy.', navigate: [{ label: 'Ir a Caja', href: '/admin/cash' }] };
        }
        const list = items.map((it) => ({ label: `${it.categoria}: ${it.descripcion}`, value: formatCentavosToCop(it.valor) }));
        return {
          answer: `Has gastado **${formatCentavosToCop(total)}** hoy.`,
          cards: [
            { type: 'stat', title: 'Gastos de hoy', value: formatCentavosToCop(total) },
            { type: 'list', title: 'Gastos principales', items: list },
          ],
        };
      },
    },
    {
      name: 'finance.expenses_by_period',
      description: 'Gastos por periodo',
      examples: [
        'gastos del mes',
        'gastos de la semana',
        'cuánto he gastado este mes',
      ],
      keywords: ['gastos', 'gastado', 'mes', 'semana', 'año', 'periodo', 'período'],
      async handle(_q, entities, ctx) {
        const { getPeriodRange } = await import('./helpers');
        const { start, end, label } = getPeriodRange(entities.periodo as string | undefined);
        const agg = await prisma.expense.aggregate({
          _sum: { valor: true },
          where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end } },
        });
        const total = agg._sum.valor ?? 0;
        return {
          answer: total === 0
            ? `No tienes gastos ${label}.`
            : `Tus gastos ${label} suman **${formatCentavosToCop(total)}**.`,
          cards: [{ type: 'stat', title: `Gastos ${label}`, value: formatCentavosToCop(total) }],
        };
      },
    },
    {
      name: 'finance.income_vs_expenses',
      description: 'Comparación de ingresos vs gastos',
      examples: [
        'ingresos vs gastos',
        'utilidad del mes',
        'ganancias',
        'cuánto gané',
      ],
      keywords: ['utilidad', 'ganancia', 'ganancias', 'ingresos', 'gastos', 'vs', 'comparar'],
      async handle(_q, entities, ctx) {
        const { getPeriodRange } = await import('./helpers');
        const { start, end, label } = getPeriodRange(entities.periodo as string | undefined);
        const [sales, expenses] = await Promise.all([
          prisma.sale.aggregate({ _sum: { total: true }, where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end }, estado: EstadoGeneral.ACTIVO } }),
          prisma.expense.aggregate({ _sum: { valor: true }, where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end } } }),
        ]);
        const ingresos = sales._sum.total ?? 0;
        const gastos = expenses._sum.valor ?? 0;
        const utilidad = ingresos - gastos;
        const margin = ingresos > 0 ? Math.round((utilidad / ingresos) * 100) : 0;
        return {
          answer: `📊 **${label.charAt(0).toUpperCase() + label.slice(1)}**:\n\n• Ingresos: ${formatCentavosToCop(ingresos)}\n• Gastos: ${formatCentavosToCop(gastos)}\n• **Utilidad: ${formatCentavosToCop(utilidad)}** (${margin}% margen)`,
          cards: [
            { type: 'stat', title: 'Ingresos', value: formatCentavosToCop(ingresos) },
            { type: 'stat', title: 'Gastos', value: formatCentavosToCop(gastos) },
            { type: 'stat', title: 'Utilidad', value: formatCentavosToCop(utilidad), subtitle: `${margin}% margen` },
          ],
        };
      },
    },
  ];
}
