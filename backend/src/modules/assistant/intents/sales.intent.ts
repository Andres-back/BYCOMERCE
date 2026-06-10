import { PrismaService } from '../../../database/prisma.service';
import { IntentDefinition, IntentResult } from './intent.types';
import { formatCentavosToCop, formatNumber, getPeriodRange } from './helpers';
import { EstadoGeneral, Prisma, Sale } from '../../../database/prisma-client';

type SaleWithItems = Prisma.SaleGetPayload<{ include: { items: { include: { product: true } } } }>;

export function createSalesIntents(prisma: PrismaService): IntentDefinition[] {
  return [
    {
      name: 'sales.total',
      description: 'Consulta el total de ventas en un periodo',
      examples: [
        'cuánto vendí hoy',
        'ventas de hoy',
        'cuánto vendí esta semana',
        'ventas del mes',
        'total de ventas',
        'ingresos de hoy',
        'facturación de hoy',
        'cuánto facturé',
      ],
      keywords: ['ventas', 'vendi', 'vendí', 'facturacion', 'facturación', 'ingresos', 'facture', 'facturé', 'total'],
      async handle(_q, entities, ctx) {
        const { start, end, label } = getPeriodRange(entities.periodo as string | undefined);
        const [agg, count] = await Promise.all([
          prisma.sale.aggregate({
            _sum: { total: true },
            where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end }, estado: EstadoGeneral.ACTIVO },
          }),
          prisma.sale.count({
            where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end }, estado: EstadoGeneral.ACTIVO },
          }),
        ]);
        const totalCentavos = agg._sum.total ?? 0;
        if (count === 0) {
          return {
            answer: `No se registran ventas ${label}. ¿Quieres revisar los pasos para registrar una venta en el POS?`,
            navigate: [{ label: 'Ir al POS', href: '/admin/pos' }],
            suggestions: ['¿Cómo registro una venta?', 'Ver mi caja'],
          };
        }
        return {
          answer: `Vendiste ${formatCentavosToCop(totalCentavos)} en ${count} ${count === 1 ? 'venta' : 'ventas'} ${label}.`,
          cards: [
            { type: 'stat', title: `Ventas ${label}`, value: formatCentavosToCop(totalCentavos), subtitle: `${count} transacciones` },
          ],
          suggestions: ['¿Cuál es mi producto más vendido?', 'Comparar con la semana pasada', 'Ver mi caja'],
        };
      },
    },
    {
      name: 'sales.top_products',
      description: 'Productos más vendidos en un periodo',
      examples: [
        'productos más vendidos',
        'qué vendo más',
        'top productos',
        'producto estrella',
        'lo que más vendo',
        'producto más vendido',
      ],
      keywords: ['producto', 'productos', 'mas', 'más', 'vendido', 'vendidos', 'top', 'estrella', 'vendo'],
      async handle(_q, entities, ctx) {
        const { start, end, label } = getPeriodRange(entities.periodo as string | undefined);
        const grouped = await prisma.saleItem.groupBy({
          by: ['productId'],
          where: { sale: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end }, estado: EstadoGeneral.ACTIVO } },
          _sum: { cantidad: true, subtotal: true },
          orderBy: { _sum: { cantidad: 'desc' } },
          take: 5,
        });
        if (grouped.length === 0) {
          return {
            answer: `Aún no hay ventas ${label} para identificar productos destacados. Empieza a registrar ventas en el POS.`,
            navigate: [{ label: 'Ir al POS', href: '/admin/pos' }],
          };
        }
        const productIds = grouped.map((g) => g.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, nombre: true, precio: true },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));
        const items = grouped.map((g) => {
          const p = productMap.get(g.productId);
          return {
            label: p?.nombre ?? 'Producto eliminado',
            value: `${g._sum.cantidad ?? 0} uds · ${formatCentavosToCop(g._sum.subtotal ?? 0)}`,
          };
        });
        return {
          answer: `Tus ${items.length} productos más vendidos ${label} son:\n\n${items.map((it, i) => `${i + 1}. **${it.label}** — ${it.value}`).join('\n')}`,
          cards: [{ type: 'list', title: `Top ${items.length} productos ${label}`, items }],
          navigate: [{ label: 'Ver inventario', href: '/admin/inventory' }],
        };
      },
    },
    {
      name: 'sales.today_summary',
      description: 'Resumen del día: ventas, ticket promedio, productos',
      examples: [
        'resumen del día',
        'cómo va el día',
        'cómo vamos hoy',
        'reporte de hoy',
        'resumen de hoy',
      ],
      keywords: ['resumen', 'dia', 'día', 'vamos', 'reporte', 'como', 'cómo'],
      async handle(_q, _e, ctx) {
        const { start, end } = getPeriodRange('HOY');
        const [agg, count, topProduct] = await Promise.all([
          prisma.sale.aggregate({
            _sum: { total: true },
            where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end }, estado: EstadoGeneral.ACTIVO },
          }),
          prisma.sale.count({
            where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end }, estado: EstadoGeneral.ACTIVO },
          }),
          prisma.saleItem.groupBy({
            by: ['productId'],
            where: { sale: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end }, estado: EstadoGeneral.ACTIVO } },
            _sum: { cantidad: true },
            orderBy: { _sum: { cantidad: 'desc' } },
            take: 1,
          }),
        ]);
        const total = agg._sum.total ?? 0;
        const avg = count > 0 ? Math.round(total / count) : 0;
        let topProductName = '—';
        if (topProduct.length > 0) {
          const p = await prisma.product.findUnique({ where: { id: topProduct[0].productId }, select: { nombre: true } });
          topProductName = p?.nombre ?? 'Producto eliminado';
        }
        return {
          answer:
            `📊 **Resumen de hoy**\n\n` +
            `• Ventas totales: ${formatCentavosToCop(total)}\n` +
            `• Transacciones: ${count}\n` +
            `• Ticket promedio: ${formatCentavosToCop(avg)}\n` +
            `• Producto más vendido: ${topProductName}`,
          cards: [
            { type: 'stat', title: 'Ventas hoy', value: formatCentavosToCop(total), subtitle: `${count} transacciones` },
            { type: 'stat', title: 'Ticket promedio', value: formatCentavosToCop(avg) },
          ],
          suggestions: ['Productos más vendidos', 'Pedidos pendientes', 'Ver mi caja'],
        };
      },
    },
    {
      name: 'sales.by_payment_method',
      description: 'Ventas agrupadas por método de pago',
      examples: [
        'ventas por método de pago',
        'cuánto vendí en efectivo',
        'ventas en tarjeta',
        'ventas en transferencia',
      ],
      keywords: ['metodo', 'método', 'pago', 'efectivo', 'tarjeta', 'transferencia', 'mixto'],
      async handle(_q, entities, ctx) {
        const { start, end, label } = getPeriodRange(entities.periodo as string | undefined);
        const grouped = await prisma.sale.groupBy({
          by: ['metodoPago'],
          where: { tenantId: ctx.tenantId, fecha: { gte: start, lte: end }, estado: EstadoGeneral.ACTIVO },
          _sum: { total: true },
          _count: true,
        });
        if (grouped.length === 0) {
          return { answer: `No hay ventas ${label} para analizar por método de pago.` };
        }
        const total = grouped.reduce((sum, g) => sum + (g._sum.total ?? 0), 0);
        const items = grouped.map((g) => {
          const monto = g._sum.total ?? 0;
          const pct = total > 0 ? Math.round((monto / total) * 100) : 0;
          return {
            label: g.metodoPago,
            value: `${formatCentavosToCop(monto)} (${pct}%) · ${g._count} ventas`,
          };
        });
        return {
          answer: `Distribución de ventas ${label} por método de pago:\n\n${items.map((it) => `• **${it.label}**: ${it.value}`).join('\n')}`,
          cards: [{ type: 'list', title: `Métodos de pago ${label}`, items }],
        };
      },
    },
  ];
}

// Re-export Sale type for consumers
export type { SaleWithItems, Sale };
