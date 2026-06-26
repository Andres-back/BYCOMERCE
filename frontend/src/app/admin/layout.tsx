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
import { AssistantButton } from '@/components/shared/assistant-button';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { authService } from '@/services/auth/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { useI18n } from '@/providers/i18n-provider';

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
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200',
        active
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
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
  const { t } = useI18n();
  const branding = useBranding();
  const initials = user?.nombre?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??';
  const [collapsed] = useState(false);

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--color-sidebar)' }}>
      {/* Logo */}
      <div className={cn('flex h-14 items-center gap-3 border-b border-sidebar-border px-4', collapsed && 'justify-center')}>
        {branding.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logo} alt={branding.businessName} className="size-9 rounded-lg object-cover ring-1 ring-primary/20" />
        ) : (
          <Image src="/icons/icono.png" alt="Mocoa Market" width={36} height={36} className="rounded-lg ring-1 ring-primary/20" unoptimized />
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{branding.businessName}</p>
            <p className="truncate text-xs text-muted-foreground">Panel de administración</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {/* Dashboard */}
        <div className="space-y-1">
          <NavLink
            href="/admin"
            label={t('nav.panel')}
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
                <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
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
        <div className={cn('flex items-center gap-3 rounded-lg border border-transparent px-2 py-2', !collapsed && 'hover:border-border hover:bg-muted/50')}>
          <Avatar className="size-9 ring-1 ring-primary/20">
            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
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
            onClick={() => { void logout().finally(() => { window.location.href = '/auth/login'; }); }}
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
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [bootstrapping, setBootstrapping] = useState(!user);

  useEffect(() => {
    let cancelled = false;
    if (user) {
      setBootstrapping(false);
      return;
    }

    authService.me()
      .then((sessionUser) => {
        if (!cancelled) setSession(sessionUser);
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
          window.location.href = '/auth/login';
        }
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });

    return () => { cancelled = true; };
  }, [clearSession, setSession, user]);

  if (bootstrapping || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <BrandingProvider>
      <CommandPalette />
      <AssistantButton />
      <div className="admin-shell-bg flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden h-screen w-64 shrink-0 border-r border-border shadow-sm lg:block" style={{ backgroundColor: 'var(--color-sidebar)' }}>
          <SidebarContent pathname={pathname} />
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl lg:px-6">
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
                className="flex size-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                title={isDark ? 'Modo claro' : 'Modo oscuro'}
              >
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <NotificationBell />
              <Link
                href="/"
                className="flex h-9 items-center gap-2 rounded-lg border border-transparent px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
              >
                <AppIcon name="tienda" className="size-4" />
                <span className="hidden sm:inline">Tienda</span>
              </Link>
            </div>
          </header>

          {/* Content */}
          <main className="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8">{children}</main>
        </div>
      </div>
    </BrandingProvider>
  );
}
