import { IntentDefinition } from './intent.types';

interface NavEntry {
  patterns: string[];
  href: string;
  label: string;
  description: string;
}

const NAV_ENTRIES: NavEntry[] = [
  { patterns: ['inventario', 'productos', 'ir a inventario', 'abrir inventario'], href: '/admin/inventory', label: 'Inventario', description: 'Gestiona productos, categorías y stock' },
  { patterns: ['pos', 'punto de venta', 'ir al pos', 'abrir pos', 'caja registradora'], href: '/admin/pos', label: 'Punto de Venta', description: 'Registra ventas rápidamente' },
  { patterns: ['pedidos', 'orders', 'ir a pedidos', 'abrir pedidos', 'delivery'], href: '/admin/orders', label: 'Pedidos', description: 'Gestiona los pedidos de tus clientes' },
  { patterns: ['clientes', 'customers', 'ir a clientes', 'abrir clientes'], href: '/admin/customers', label: 'Clientes', description: 'Tu base de clientes' },
  { patterns: ['caja', 'cash', 'ir a caja', 'abrir caja'], href: '/admin/cash', label: 'Caja', description: 'Apertura, cierre y movimientos' },
  { patterns: ['usuarios', 'users', 'ir a usuarios', 'equipo', 'empleados'], href: '/admin/users', label: 'Usuarios', description: 'Gestiona tu equipo' },
  { patterns: ['configuración', 'configuracion', 'settings', 'ir a configuración', 'preferencias'], href: '/admin/settings', label: 'Configuración', description: 'Personaliza tu negocio' },
  { patterns: ['suscripción', 'suscripcion', 'planes', 'ir a suscripción', 'mi plan'], href: '/admin/plans', label: 'Suscripción', description: 'Tu plan y pagos' },
  { patterns: ['dashboard', 'inicio', 'ir al inicio', 'tablero'], href: '/admin', label: 'Dashboard', description: 'Resumen general de tu negocio' },
  { patterns: ['compras', 'purchases', 'ir a compras', 'proveedores'], href: '/admin/purchases', label: 'Compras', description: 'Compras a proveedores' },
];

export function createNavigationIntents(): IntentDefinition[] {
  return [
    {
      name: 'navigation.go',
      description: 'Navegar a una sección del panel',
      examples: [
        'ir a inventario',
        'abrir POS',
        'ir a configuración',
        'ir a pedidos',
        'mostrar caja',
      ],
      keywords: ['ir', 'abrir', 'mostrar', 'llevame', 'llévame', 'navegar', 'donde', 'dónde', 'voy'],
      async handle(q) {
        await Promise.resolve();
        const lower = q.toLowerCase();
        const matched = NAV_ENTRIES.find((n) => n.patterns.some((p) => lower.includes(p)));
        if (!matched) {
          return {
            answer: 'No reconocí a qué sección quieres ir. Puedo llevarte a: Inventario, POS, Pedidos, Clientes, Caja, Usuarios, Configuración, Suscripción o Dashboard.',
            suggestions: NAV_ENTRIES.slice(0, 4).map((n) => `Ir a ${n.label}`),
          };
        }
        return {
          answer: `Te llevo a **${matched.label}** — ${matched.description}.`,
          navigate: [{ label: `Ir a ${matched.label}`, href: matched.href }],
        };
      },
    },
  ];
}
