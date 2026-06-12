'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from '@/hooks/use-socket';
import { NotificationBell } from '@/components/shared/notification-bell';
import { BrandingProvider, useBranding } from '@/providers/branding-provider';
import { AppIcon } from '@/components/shared/app-icon';
import { CommandPalette } from '@/components/shared/command-palette';
import { useTheme } from 'next-themes';
import { useState } from 'react';

type RoleAccess = 'ADMIN_NEGOCIO' | 'SUPERVISOR' | 'CAJERO' | 'DOMICILIARIO';

const navGroups = [
  {
    label: 'Gestión',
    items: [
      { href: '/admin/customers', label: 'Clientes', icon: 'clientes', roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] as RoleAccess[] },
      { href: '/admin/inventory', label: 'Inventario', icon: 'inventario', roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] as RoleAccess[] },
      { href: '/admin/purchases', label: 'Compras', icon: 'compras', roles: ['ADMIN_NEGOCIO'] as RoleAccess[] },
      { href: '/admin/branches', label: 'Sucursales', icon: 'sucursales', roles: ['ADMIN_NEGOCIO'] as RoleAccess[] },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { href: '/admin/pos', label: 'Punto de Venta', icon: 'punto-venta', roles: ['ADMIN_NEGOCIO', 'SUPERVISOR', 'CAJERO'] as RoleAccess[] },
      { href: '/admin/orders', label: 'Pedidos', icon: 'pedidos', roles: ['ADMIN_NEGOCIO', 'SUPERVISOR', 'DOMICILIARIO'] as RoleAccess[] },
      { href: '/admin/promotions', label: 'Promociones', icon: 'promociones', roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] as RoleAccess[] },
      { href: '/admin/delivery', label: 'Domiciliarios', icon: 'domiciliarios', roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] as RoleAccess[] },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/admin/cash', label: 'Caja', icon: 'caja', roles: ['ADMIN_NEGOCIO', 'SUPERVISOR', 'CAJERO'] as RoleAccess[] },
      { href: '/admin/reports', label: 'Reportes', icon: 'reportes', roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] as RoleAccess[] },
      { href: '/admin/plans', label: 'Suscripción', icon: 'marketplace', roles: ['ADMIN_NEGOCIO'] as RoleAccess[] },
    ],
  },
  {
    label: 'Equipo',
    items: [
      { href: '/admin/users', label: 'Usuarios', icon: 'usuarios', roles: ['ADMIN_NEGOCIO'] as RoleAccess[] },
      { href: '/admin/loyalty', label: 'Fidelización', icon: 'fidelizacion', roles: ['ADMIN_NEGOCIO', 'SUPERVISOR'] as RoleAccess[] },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/admin/settings', label: 'Ajustes', icon: 'ajustes', roles: ['ADMIN_NEGOCIO'] as RoleAccess[] },
      { href: '/admin/notifications', label: 'Notificaciones', icon: 'notificaciones', roles: ['ADMIN_NEGOCIO', 'SUPERVISOR', 'CAJERO', 'DOMICILIARIO'] as RoleAccess[] },
    ],
  },
];

const superadminNavItems = [
  { href: '/admin/superadmin', label: 'Panel SA', icon: 'ajustes', exact: true },
  { href: '/admin/superadmin/tenants', label: 'Tenants', icon: 'tienda' },
  { href: '/admin/superadmin/plans', label: 'Planes', icon: 'marketplace' },
  { href: '/admin/superadmin/audit', label: 'Auditoría', icon: 'reportes' },
];

function NavLink({ href, label, icon, exact, pathname, collapsed }: {
  href: string; label: string; icon: string; exact?: boolean; pathname: string; collapsed?: boolean;
}) {
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
      title={collapsed ? label : undefined}
    >
      <AppIcon name={icon} className={cn('size-4.5 shrink-0', active ? 'brightness-0 invert' : 'opacity-70')} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SidebarContent({ pathname }: { pathname: string }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const branding = useBranding();
  const initials = user?.nombre?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??';
  const [collapsed] = useState(false);

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--color-sidebar)' }}>
      {/* Logo */}
      <div className={cn('flex items-center gap-3 border-b border-sidebar-border px-4', collapsed ? 'justify-center py-4' : 'py-4')}>
        {branding.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logo} alt={branding.businessName} className="size-9 rounded-xl object-cover ring-2 ring-teal-100" />
        ) : (
          <Image src="/icons/icono.png" alt="Mocoa Market" width={36} height={36} className="rounded-xl ring-2 ring-teal-100" unoptimized />
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{branding.businessName}</p>
            <p className="truncate text-xs text-muted-foreground">Panel de administración</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {/* Dashboard */}
        <div className="space-y-1">
          <NavLink
            href="/admin"
            label="Dashboard"
            icon="dashboard"
            exact
            pathname={pathname}
            collapsed={collapsed}
          />
        </div>

        {/* Groups */}
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(user?.rol as RoleAccess));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
              )}
              {visibleItems.map((item) => (
                <NavLink key={item.href} {...item} pathname={pathname} collapsed={collapsed} />
              ))}
            </div>
          );
        })}

        {/* Superadmin */}
        {isSuperAdmin && (
          <>
            {!collapsed && <Separator className="my-2" />}
            {!collapsed && (
              <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-amber-500">
                Super Admin
              </p>
            )}
            {superadminNavItems.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} collapsed={collapsed} />
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <Separator />
      <div className="p-3">
        <div className={cn('flex items-center gap-3 rounded-xl px-2 py-2', !collapsed && 'hover:bg-muted/50')}>
          <Avatar className="size-9 ring-2 ring-teal-100">
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-500 text-xs font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user?.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => { logout(); window.location.href = '/auth/login'; }}
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  useSocket();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <BrandingProvider>
      <CommandPalette />
      <div className="admin-shell-bg flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border shadow-sm lg:block" style={{ backgroundColor: 'var(--color-sidebar)' }}>
          <SidebarContent pathname={pathname} />
        </aside>

        {/* Main */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/88 px-4 backdrop-blur-xl lg:px-6">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden border-border" />}>
                <Menu className="size-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent pathname={pathname} />
              </SheetContent>
            </Sheet>

            <div className="flex-1" />

            {/* Header Right */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={isDark ? 'Modo claro' : 'Modo oscuro'}
              >
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <NotificationBell />
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <AppIcon name="tienda" className="size-4" />
                <span className="hidden sm:inline">Tienda</span>
              </Link>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 lg:p-8 min-w-0 overflow-hidden">{children}</main>
        </div>
      </div>
    </BrandingProvider>
  );
}
