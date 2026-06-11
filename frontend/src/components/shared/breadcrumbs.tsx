'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  admin: 'Dashboard',
  customers: 'Clientes',
  inventory: 'Inventario',
  purchases: 'Compras',
  orders: 'Pedidos',
  pos: 'Punto de Venta',
  cash: 'Caja',
  users: 'Usuarios',
  plans: 'Suscripción',
  settings: 'Configuración',
  reports: 'Reportes',
  notifications: 'Notificaciones',
  delivery: 'Domiciliarios',
  promotions: 'Promociones',
  loyalty: 'Fidelización',
  branches: 'Sucursales',
  superadmin: 'Super Admin',
  tenants: 'Tenants',
  audit: 'Auditoría',
  route: 'Ruta',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <Link href="/admin" className="transition-colors hover:text-primary">
        <Home className="size-3.5" />
      </Link>
      {segments.slice(1).map((segment, index) => {
        const href = '/' + segments.slice(0, index + 2).join('/');
        const label = routeLabels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
        const isLast = index === segments.length - 2;
        return (
          <div key={segment} className="flex items-center gap-1.5">
            <ChevronRight className="size-3 text-muted-foreground/50" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="transition-colors hover:text-primary">
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
