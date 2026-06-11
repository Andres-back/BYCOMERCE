'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, Users, Package, ShoppingCart, ClipboardList, CreditCard, Banknote, Settings, Store, UserCog, Gem, BarChart3, Bell, Truck, Tag, Award, Building2, Shield } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useAuth } from '@/hooks/use-auth';

type RoleAccess = 'ADMIN_NEGOCIO' | 'SUPERVISOR' | 'CAJERO' | 'DOMICILIARIO';

interface CommandItemConfig {
  label: string;
  href: string;
  icon: React.ElementType;
  keywords: string[];
  roles: RoleAccess[];
}

const allCommands: CommandItemConfig[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, keywords: ['inicio', 'panel', 'kpi'], roles: ['ADMIN_NEGOCIO', 'SUPERVISOR', 'CAJERO', 'DOMICILIARIO'] },
  { label: 'Clientes', href: '/admin/customers', icon: Users, keywords: ['clientes', 'crm', 'personas'], roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] },
  { label: 'Inventario', href: '/admin/inventory', icon: Package, keywords: ['productos', 'stock', 'categorias'], roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] },
  { label: 'Compras', href: '/admin/purchases', icon: ShoppingCart, keywords: ['proveedores', 'ordenes compra'], roles: ['ADMIN_NEGOCIO'] },
  { label: 'Pedidos', href: '/admin/orders', icon: ClipboardList, keywords: ['ordenes', 'delivery', 'domicilios'], roles: ['ADMIN_NEGOCIO', 'SUPERVISOR', 'DOMICILIARIO'] },
  { label: 'Punto de Venta', href: '/admin/pos', icon: CreditCard, keywords: ['pos', 'vender', 'cobrar', 'caja'], roles: ['ADMIN_NEGOCIO', 'SUPERVISOR', 'CAJERO'] },
  { label: 'Caja', href: '/admin/cash', icon: Banknote, keywords: ['dinero', 'arqueo', 'gastos'], roles: ['ADMIN_NEGOCIO', 'SUPERVISOR', 'CAJERO'] },
  { label: 'Promociones', href: '/admin/promotions', icon: Tag, keywords: ['ofertas', 'descuentos', 'cupones'], roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] },
  { label: 'Domiciliarios', href: '/admin/delivery', icon: Truck, keywords: ['repartidores', 'domicilio', 'rutas'], roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] },
  { label: 'Fidelización', href: '/admin/loyalty', icon: Award, keywords: ['puntos', 'recompensas', 'niveles'], roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] },
  { label: 'Sucursales', href: '/admin/branches', icon: Building2, keywords: ['sucursales', 'locales'], roles: ['ADMIN_NEGOCIO'] },
  { label: 'Reportes', href: '/admin/reports', icon: BarChart3, keywords: ['reportes', 'estadisticas', 'graficas'], roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] },
  { label: 'Usuarios', href: '/admin/users', icon: UserCog, keywords: ['empleados', 'roles', 'equipo'], roles: ['ADMIN_NEGOCIO'] },
  { label: 'Suscripción', href: '/admin/plans', icon: Gem, keywords: ['planes', 'pagos', 'factura'], roles: ['ADMIN_NEGOCIO'] },
  { label: 'Configuración', href: '/admin/settings', icon: Settings, keywords: ['ajustes', 'perfil', 'negocio'], roles: ['ADMIN_NEGOCIO'] },
  { label: 'Notificaciones', href: '/admin/notifications', icon: Bell, keywords: ['alertas', 'avisos'], roles: ['ADMIN_NEGOCIO', 'SUPERVISOR', 'CAJERO', 'DOMICILIARIO'] },
];

export function CommandPalette() {
  const router = useRouter();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const availableCommands = allCommands.filter((cmd) => role && cmd.roles.includes(role as RoleAccess));

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar página o funcionalidad..." />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Navegación">
          {availableCommands.map((cmd) => (
            <CommandItem key={cmd.href} onSelect={() => handleSelect(cmd.href)} keywords={cmd.keywords}>
              <cmd.icon className="mr-2 size-4" />
              {cmd.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
