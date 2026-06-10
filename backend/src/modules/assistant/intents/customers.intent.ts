import { PrismaService } from '../../../database/prisma.service';
import { IntentDefinition } from './intent.types';
import { formatCentavosToCop, formatNumber } from './helpers';
import { EstadoGeneral } from '../../../database/prisma-client';

export function createCustomersIntents(prisma: PrismaService): IntentDefinition[] {
  return [
    {
      name: 'customers.count',
      description: 'Cantidad de clientes',
      examples: [
        'cuántos clientes tengo',
        'total de clientes',
        'mis clientes',
        'tamaño de mi base de clientes',
      ],
      keywords: ['clientes', 'cliente', 'cuantos', 'cuántos', 'total', 'base'],
      async handle(_q, _e, ctx) {
        const total = await prisma.customer.count({ where: { tenantId: ctx.tenantId } });
        const withOrders = await prisma.customer.count({
          where: { tenantId: ctx.tenantId, orders: { some: {} } },
        });
        const withSales = await prisma.customer.count({
          where: { tenantId: ctx.tenantId, sales: { some: {} } },
        });
        return {
          answer: `Tienes **${formatNumber(total)} clientes** registrados. ${formatNumber(withOrders)} han hecho pedidos y ${formatNumber(withSales)} han comprado en el POS.`,
          cards: [
            { type: 'stat', title: 'Clientes totales', value: formatNumber(total) },
            { type: 'stat', title: 'Con pedidos', value: formatNumber(withOrders) },
            { type: 'stat', title: 'Con compras POS', value: formatNumber(withSales) },
          ],
          navigate: [{ label: 'Ver clientes', href: '/admin/customers' }],
        };
      },
    },
    {
      name: 'customers.top',
      description: 'Clientes con más compras',
      examples: [
        'mejores clientes',
        'cliente más frecuente',
        'clientes top',
        'quién compra más',
        'cliente vip',
      ],
      keywords: ['mejores', 'top', 'frecuente', 'vip', 'quien', 'quién', 'compra', 'cliente'],
      async handle(_q, _e, ctx) {
        const grouped = await prisma.sale.groupBy({
          by: ['customerId'],
          where: { tenantId: ctx.tenantId, customerId: { not: null }, estado: EstadoGeneral.ACTIVO },
          _sum: { total: true },
          _count: true,
          orderBy: { _sum: { total: 'desc' } },
          take: 5,
        });
        if (grouped.length === 0) {
          return {
            answer: 'Aún no hay ventas asociadas a clientes. Empieza a registrar ventas asignando un cliente.',
            navigate: [{ label: 'Ir al POS', href: '/admin/pos' }],
          };
        }
        const customerIds = grouped.map((g) => g.customerId).filter(Boolean) as string[];
        const customers = await prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, nombre: true, telefono: true },
        });
        const cMap = new Map(customers.map((c) => [c.id, c]));
        const items = grouped.map((g) => {
          const c = g.customerId ? cMap.get(g.customerId) : null;
          return {
            label: c?.nombre ?? 'Cliente sin nombre',
            value: `${formatCentavosToCop(g._sum.total ?? 0)} en ${g._count} compras`,
          };
        });
        return {
          answer: `Tus ${items.length} clientes que más han comprado:`,
          cards: [{ type: 'list', title: 'Top clientes', items }],
          navigate: [{ label: 'Ver clientes', href: '/admin/customers' }],
        };
      },
    },
    {
      name: 'customers.recent',
      description: 'Clientes registrados recientemente',
      examples: [
        'clientes nuevos',
        'clientes recientes',
        'últimos clientes',
      ],
      keywords: ['nuevos', 'recientes', 'ultimos', 'últimos', 'reciente'],
      async handle(_q, _e, ctx) {
        const customers = await prisma.customer.findMany({
          where: { tenantId: ctx.tenantId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, nombre: true, telefono: true, createdAt: true },
        });
        if (customers.length === 0) {
          return { answer: 'Aún no tienes clientes registrados.', navigate: [{ label: 'Ir a clientes', href: '/admin/customers' }] };
        }
        const items = customers.map((c) => ({
          label: c.nombre,
          value: c.telefono + (c.createdAt ? ` · ${new Date(c.createdAt).toLocaleDateString('es-CO')}` : ''),
        }));
        return {
          answer: `Tus últimos ${customers.length} clientes registrados:`,
          cards: [{ type: 'list', title: 'Clientes recientes', items }],
        };
      },
    },
  ];
}
