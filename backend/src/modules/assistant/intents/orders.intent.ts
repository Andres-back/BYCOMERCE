import { PrismaService } from '../../../database/prisma.service';
import { IntentDefinition } from './intent.types';
import { EstadoGeneral, OrderStatus } from '../../../database/prisma-client';

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDIENTE]: 'Pendientes',
  [OrderStatus.CONFIRMADO]: 'Confirmados',
  [OrderStatus.PREPARANDO]: 'En preparación',
  [OrderStatus.LISTO_PARA_ENTREGA]: 'Listos para entrega',
  [OrderStatus.EN_CAMINO]: 'En camino',
  [OrderStatus.ENTREGADO]: 'Entregados',
  [OrderStatus.CANCELADO]: 'Cancelados',
};

export function createOrdersIntents(prisma: PrismaService): IntentDefinition[] {
  return [
    {
      name: 'orders.pending',
      description: 'Pedidos pendientes de confirmar',
      examples: [
        'pedidos pendientes',
        'cuántos pedidos pendientes',
        'tengo pedidos nuevos',
        'pedidos por confirmar',
      ],
      keywords: ['pedidos', 'pendientes', 'nuevos', 'confirmar'],
      async handle(_q, _e, ctx) {
        const count = await prisma.order.count({
          where: { tenantId: ctx.tenantId, estado: OrderStatus.PENDIENTE },
        });
        if (count === 0) {
          return {
            answer: '✅ No tienes pedidos pendientes. Todo está al día.',
            navigate: [{ label: 'Ver pedidos', href: '/admin/orders' }],
          };
        }
        const orders = await prisma.order.findMany({
          where: { tenantId: ctx.tenantId, estado: OrderStatus.PENDIENTE },
          orderBy: { fecha: 'desc' },
          take: 5,
          select: {
            id: true,
            total: true,
            fecha: true,
            direccion: true,
            customer: { select: { nombre: true } },
          },
        });
        const formatCop = (c: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(c / 100);
        const items = orders.map((o) => ({
          label: `${o.customer?.nombre ?? 'Cliente'} · ${formatCop(o.total)}`,
          value: o.direccion,
          href: '/admin/orders',
        }));
        return {
          answer: `Tienes **${count} pedido(s) pendiente(s)** de confirmar. Los más recientes:`,
          cards: [
            { type: 'stat', title: 'Pendientes', value: String(count) },
            { type: 'list', title: 'Últimos pendientes', items },
          ],
          navigate: [{ label: 'Ver pedidos', href: '/admin/orders' }],
          suggestions: ['Pedidos en preparación', 'Pedidos en camino'],
        };
      },
    },
    {
      name: 'orders.by_status',
      description: 'Pedidos por estado',
      examples: [
        'pedidos en preparación',
        'pedidos en camino',
        'pedidos listos',
        'pedidos entregados hoy',
        'cuántos pedidos en camino',
      ],
      keywords: ['pedidos', 'preparacion', 'preparación', 'camino', 'listos', 'entregados', 'cancelados'],
      async handle(q, _e, ctx) {
        const lower = q.toLowerCase();
        let status: OrderStatus = OrderStatus.PENDIENTE;
        let label = 'pendientes';
        if (lower.includes('preparaci') || lower.includes('preparacion')) {
          status = OrderStatus.PREPARANDO; label = 'en preparación';
        } else if (lower.includes('camino') || lower.includes('domicilio')) {
          status = OrderStatus.EN_CAMINO; label = 'en camino';
        } else if (lower.includes('listo')) {
          status = OrderStatus.LISTO_PARA_ENTREGA; label = 'listos para entrega';
        } else if (lower.includes('entregado')) {
          status = OrderStatus.ENTREGADO; label = 'entregados';
        } else if (lower.includes('cancelado')) {
          status = OrderStatus.CANCELADO; label = 'cancelados';
        } else if (lower.includes('confirmado')) {
          status = OrderStatus.CONFIRMADO; label = 'confirmados';
        }
        const count = await prisma.order.count({ where: { tenantId: ctx.tenantId, estado: status } });
        return {
          answer: `Tienes **${count} pedido(s) ${label}**.`,
          cards: [{ type: 'stat', title: STATUS_LABELS[status], value: String(count) }],
          navigate: [{ label: 'Ver pedidos', href: '/admin/orders' }],
        };
      },
    },
    {
      name: 'orders.today',
      description: 'Pedidos recibidos hoy',
      examples: [
        'pedidos de hoy',
        'cuántos pedidos hoy',
        'pedidos del día',
      ],
      keywords: ['pedidos', 'hoy', 'dia', 'día'],
      async handle(_q, _e, ctx) {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        const [count, total] = await Promise.all([
          prisma.order.count({ where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end } } }),
          prisma.order.aggregate({ _sum: { total: true }, where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end } } }),
        ]);
        const formatCop = (c: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(c / 100);
        return {
          answer: `Hoy has recibido **${count} pedido(s)** por un total de ${formatCop(total._sum.total ?? 0)}.`,
          cards: [{ type: 'stat', title: 'Pedidos hoy', value: String(count), subtitle: formatCop(total._sum.total ?? 0) }],
          navigate: [{ label: 'Ver pedidos', href: '/admin/orders' }],
        };
      },
    },
  ];
}
