export const esCO = {
  nav: {
    management: 'Gestión',
    sales: 'Ventas',
    finances: 'Finanzas',
    team: 'Equipo',
    settings: 'Configuración',
    panel: 'Panel',
    pointOfSale: 'Punto de venta',
    subscriptions: 'Suscripción',
    loyalty: 'Fidelización',
    audit: 'Auditoría',
    tenants: 'Comercios',
  },
  common: {
    all: 'Todos',
    store: 'Tienda',
    delivery: 'Domicilios',
    logout: 'Cerrar sesión',
    adminPanel: 'Panel de administración',
  },
} as const;

export type MessageKey =
  | `nav.${keyof typeof esCO.nav}`
  | `common.${keyof typeof esCO.common}`;

export function translate(key: MessageKey): string {
  const [namespace, item] = key.split('.') as [keyof typeof esCO, string];
  return (esCO[namespace] as Record<string, string>)[item] ?? key;
}
