import { PrismaService } from '../../../database/prisma.service';
import { IntentDefinition } from './intent.types';
import { formatNumber, isActiveEstado } from './helpers';
import { EstadoGeneral } from '../../../database/prisma-client';

export function createInventoryIntents(prisma: PrismaService): IntentDefinition[] {
  return [
    {
      name: 'inventory.low_stock',
      description: 'Productos con stock bajo o agotados',
      examples: [
        'qué productos tienen poco stock',
        'productos con bajo stock',
        'qué se está agotando',
        'stock bajo',
        'productos por agotarse',
        'alertas de stock',
      ],
      keywords: ['stock', 'agotando', 'agotar', 'bajo', 'poco', 'alerta', 'alertas'],
      async handle(_q, _e, ctx) {
        const products = await prisma.product.findMany({
          where: { tenantId: ctx.tenantId, estado: EstadoGeneral.ACTIVO },
          select: { id: true, nombre: true, stock: true, stockMinimo: true, sku: true },
          orderBy: { stock: 'asc' },
          take: 20,
        });
        const low = products.filter((p) => p.stock <= p.stockMinimo);
        const out = products.filter((p) => p.stock === 0);
        if (low.length === 0) {
          return {
            answer: '✅ Todos tus productos tienen stock saludable. No hay alertas en este momento.',
            suggestions: ['¿Cuántos productos tengo?', 'Productos más vendidos'],
          };
        }
        const items = low.slice(0, 10).map((p) => ({
          label: p.nombre + (out.includes(p) ? ' ⚠️ AGOTADO' : ''),
          value: `${p.stock} uds (mín. ${p.stockMinimo})`,
          href: '/admin/inventory',
        }));
        return {
          answer: `Tienes **${low.length} producto(s) con stock bajo o agotado**:\n\n${items.map((it, i) => `${i + 1}. **${it.label}** — ${it.value}`).join('\n')}\n\n${out.length > 0 ? `⚠️ ${out.length} producto(s) sin stock.` : ''}`,
          cards: [{ type: 'list', title: 'Productos con bajo stock', items }],
          navigate: [{ label: 'Ir a inventario', href: '/admin/inventory' }],
          suggestions: ['¿Cuántos productos tengo?', '¿Cómo agrego un producto?'],
        };
      },
    },
    {
      name: 'inventory.count',
      description: 'Cantidad total de productos',
      examples: [
        'cuántos productos tengo',
        'total de productos',
        'cuántos productos activos',
        'tamaño de mi catálogo',
      ],
      keywords: ['cuantos', 'cuántos', 'productos', 'total', 'catalogo', 'catálogo', 'tamaño'],
      async handle(_q, _e, ctx) {
        const [total, active, categories] = await Promise.all([
          prisma.product.count({ where: { tenantId: ctx.tenantId } }),
          prisma.product.count({ where: { tenantId: ctx.tenantId, estado: EstadoGeneral.ACTIVO } }),
          prisma.category.count({ where: { tenantId: ctx.tenantId, estado: EstadoGeneral.ACTIVO } }),
        ]);
        return {
          answer: `Tienes **${formatNumber(total)} productos** en total, de los cuales **${formatNumber(active)} están activos** y **${formatNumber(categories)} categorías** configuradas.`,
          cards: [
            { type: 'stat', title: 'Productos activos', value: formatNumber(active), subtitle: `de ${formatNumber(total)} totales` },
            { type: 'stat', title: 'Categorías', value: formatNumber(categories) },
          ],
          navigate: [{ label: 'Ver inventario', href: '/admin/inventory' }],
        };
      },
    },
    {
      name: 'inventory.categories',
      description: 'Lista de categorías de productos',
      examples: [
        'mis categorías',
        'lista de categorías',
        'qué categorías tengo',
      ],
      keywords: ['categorias', 'categorías', 'lista', 'categoria', 'categoría'],
      async handle(_q, _e, ctx) {
        const categories = await prisma.category.findMany({
          where: { tenantId: ctx.tenantId, estado: EstadoGeneral.ACTIVO },
          include: { _count: { select: { products: true } } },
          orderBy: { nombre: 'asc' },
        });
        if (categories.length === 0) {
          return {
            answer: 'Aún no tienes categorías configuradas. Puedes crearlas desde Inventario > Categorías.',
            navigate: [{ label: 'Ir a inventario', href: '/admin/inventory' }],
          };
        }
        const items = categories.map((c) => ({ label: c.nombre, value: `${c._count.products} productos` }));
        return {
          answer: `Tienes **${categories.length} categorías** activas.`,
          cards: [{ type: 'list', title: 'Categorías', items }],
        };
      },
    },
    {
      name: 'inventory.search_product',
      description: 'Buscar un producto específico',
      examples: [
        'buscar producto',
        'tengo arroz',
        'información de un producto',
        'cuánto cuesta el arroz',
      ],
      keywords: ['buscar', 'busca', 'producto', 'cuanto cuesta', 'cuánto cuesta', 'precio de', 'tengo'],
      async handle(q, _e, ctx) {
        const tokens = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
        const stop = new Set(['cuanto', 'cuesta', 'tengo', 'buscar', 'busca', 'producto', 'precio', 'cual', 'cuales', 'como', 'donde', 'esta']);
        const searchTerms = tokens.filter((t) => !stop.has(t));
        if (searchTerms.length === 0) {
          return {
            answer: '¿Qué producto quieres buscar? Dime el nombre o parte de él.',
            suggestions: ['Arroz', 'Leche', 'Gaseosa'],
          };
        }
        const orConditions = searchTerms.flatMap((t) => [
          { nombre: { contains: t, mode: 'insensitive' as const } },
          { sku: { contains: t, mode: 'insensitive' as const } },
          { barcode: { contains: t, mode: 'insensitive' as const } },
        ]);
        const products = await prisma.product.findMany({
          where: { tenantId: ctx.tenantId, OR: orConditions },
          take: 5,
          select: { id: true, nombre: true, precio: true, stock: true, sku: true },
        });
        if (products.length === 0) {
          return {
            answer: `No encontré productos que coincidan con "${searchTerms.join(' ')}". Prueba con otro término o revisa tu inventario.`,
            navigate: [{ label: 'Ir a inventario', href: '/admin/inventory' }],
          };
        }
        const formatCop = (c: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(c / 100);
        const items = products.map((p) => ({
          label: p.nombre,
          value: `${formatCop(p.precio)} · Stock: ${p.stock} uds${p.sku ? ` · SKU: ${p.sku}` : ''}`,
        }));
        return {
          answer: `Encontré ${products.length} producto(s) que coinciden:`,
          cards: [{ type: 'list', title: 'Resultados', items }],
        };
      },
    },
  ];
}
