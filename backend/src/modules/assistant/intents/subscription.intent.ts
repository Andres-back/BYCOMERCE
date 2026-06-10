import { PrismaService } from '../../../database/prisma.service';
import { IntentDefinition } from './intent.types';
import { EstadoGeneral, SubscriptionStatus } from '../../../database/prisma-client';

export function createSubscriptionIntents(prisma: PrismaService): IntentDefinition[] {
  return [
    {
      name: 'subscription.current',
      description: 'Plan actual y estado de la suscripción',
      examples: [
        'mi plan actual',
        'qué plan tengo',
        'información de mi suscripción',
        'mi suscripción',
        'detalles del plan',
      ],
      keywords: ['plan', 'suscripcion', 'suscripción', 'actual', 'tengo'],
      async handle(_q, _e, ctx) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: ctx.tenantId },
          include: { plan: true, subscriptions: { orderBy: { fechaFin: 'desc' }, take: 1, include: { plan: true } } },
        });
        if (!tenant?.plan) {
          return {
            answer: 'No tienes un plan activo asignado. Contacta al equipo de Mocoa Market.',
            navigate: [{ label: 'Ver planes', href: '/admin/plans' }],
          };
        }
        const sub = tenant.subscriptions[0];
        const formatCop = (c: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(c / 100);
        const plan = tenant.plan;
        const status = sub?.estado ?? 'SIN_SUSCRIPCION';
        const fechaFin = sub?.fechaFin ? new Date(sub.fechaFin).toLocaleDateString('es-CO') : '—';
        const daysToEnd = sub ? Math.ceil((sub.fechaFin.getTime() - Date.now()) / 86_400_000) : 0;
        let statusLabel = 'Sin suscripción';
        if (status === SubscriptionStatus.ACTIVA) statusLabel = '✅ Activa';
        else if (status === SubscriptionStatus.EN_PRUEBA) statusLabel = '🟡 En prueba';
        else if (status === SubscriptionStatus.VENCIDA) statusLabel = '🔴 Vencida';
        else if (status === SubscriptionStatus.SUSPENDIDA) statusLabel = '⛔ Suspendida';
        else if (status === SubscriptionStatus.CANCELADA) statusLabel = '❌ Cancelada';
        return {
          answer: `**Plan: ${plan.nombre}**\n\n` +
            `• Estado: ${statusLabel}\n` +
            `• Costo mensual: ${formatCop(plan.precio)}\n` +
            `• Límite usuarios: ${plan.limiteUsuarios}\n` +
            `• Límite productos: ${plan.limiteProductos}\n` +
            `• Almacenamiento: ${plan.almacenamientoGb} GB\n` +
            (sub ? `• Próxima fecha de fin: ${fechaFin} (${daysToEnd} días)\n` : '') +
            (plan.descripcion ? `• ${plan.descripcion}` : ''),
          cards: [
            { type: 'stat', title: 'Plan', value: plan.nombre, subtitle: statusLabel },
            { type: 'stat', title: 'Costo mensual', value: formatCop(plan.precio) },
          ],
          navigate: [{ label: 'Ver planes', href: '/admin/plans' }],
        };
      },
    },
    {
      name: 'subscription.expiring',
      description: 'Cuándo vence el plan',
      examples: [
        'cuándo vence mi plan',
        'días restantes',
        'fecha de vencimiento',
        'cuándo se vence',
      ],
      keywords: ['vence', 'vence', 'vencimiento', 'dias', 'días', 'restantes', 'caduca'],
      async handle(_q, _e, ctx) {
        const sub = await prisma.subscription.findFirst({
          where: { tenantId: ctx.tenantId },
          include: { plan: true },
          orderBy: { fechaFin: 'desc' },
        });
        if (!sub) {
          return { answer: 'No tienes una suscripción activa registrada.' };
        }
        const daysToEnd = Math.ceil((sub.fechaFin.getTime() - Date.now()) / 86_400_000);
        const fechaFin = new Date(sub.fechaFin).toLocaleDateString('es-CO');
        let msg = `Tu plan **${sub.plan.nombre}** ${sub.estado === SubscriptionStatus.ACTIVA ? 'está activo' : 'está en estado ' + sub.estado}`;
        if (daysToEnd > 0) {
          msg += ` y vence en **${daysToEnd} días** (${fechaFin}).`;
        } else {
          msg += ` y venció hace **${Math.abs(daysToEnd)} días** (${fechaFin}).`;
        }
        return {
          answer: msg,
          cards: [{ type: 'stat', title: 'Días restantes', value: String(Math.max(0, daysToEnd)), subtitle: sub.estado }],
          suggestions: daysToEnd <= 7 ? ['Ver planes', '¿Cómo reportar un pago?'] : undefined,
        };
      },
    },
    {
      name: 'subscription.usage',
      description: 'Uso actual del plan (usuarios/productos)',
      examples: [
        'cuánto he usado del plan',
        'uso de mi plan',
        'estoy cerca del límite',
      ],
      keywords: ['uso', 'limite', 'límite', 'usado', 'capacidad'],
      async handle(_q, _e, ctx) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: ctx.tenantId },
          include: { plan: true },
        });
        if (!tenant?.plan) return { answer: 'No tienes un plan asignado.' };
        const plan = tenant.plan;
        const [users, products] = await Promise.all([
          prisma.user.count({ where: { tenantId: ctx.tenantId, estado: EstadoGeneral.ACTIVO, isSuperAdmin: false } }),
          prisma.product.count({ where: { tenantId: ctx.tenantId, estado: EstadoGeneral.ACTIVO } }),
        ]);
        const userPct = Math.round((users / plan.limiteUsuarios) * 100);
        const prodPct = Math.round((products / plan.limiteProductos) * 100);
        return {
          answer: `Uso de tu plan **${plan.nombre}**:\n\n` +
            `• Usuarios: ${users}/${plan.limiteUsuarios} (${userPct}%)\n` +
            `• Productos: ${products}/${plan.limiteProductos} (${prodPct}%)\n` +
            `• Almacenamiento: ${plan.almacenamientoGb} GB disponibles`,
          cards: [
            { type: 'stat', title: 'Usuarios', value: `${users}/${plan.limiteUsuarios}`, subtitle: `${userPct}% usado` },
            { type: 'stat', title: 'Productos', value: `${products}/${plan.limiteProductos}`, subtitle: `${prodPct}% usado` },
          ],
        };
      },
    },
  ];
}
