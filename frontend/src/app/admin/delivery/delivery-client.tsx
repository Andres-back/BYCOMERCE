'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Search, UserPlus, ShieldOff, ShieldCheck, Truck, Bike, Route, PackageCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/layouts/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, useInviteUser, useDeactivateUser, useActivateUser } from '@/hooks/use-users';
import { useOrders } from '@/hooks/use-orders';


import type { UserItem } from '@/services/users/users.service';

export default function DeliveryClient() {
  const { token } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<UserItem | null>(null);
  const [activateTarget, setActivateTarget] = useState<UserItem | null>(null);

  const filters = useMemo(() => {
    const f: Record<string, string> = { rol: 'DOMICILIARIO' };
    if (search) f.q = search;
    if (statusFilter !== 'all') f.estado = statusFilter;
    return f;
  }, [search, statusFilter]);

  const { data: usersData, isLoading } = useUsers(filters);
  const users = usersData?.data ?? [];
  const { data: orders = [] } = useOrders(token!);
  const inviteMut = useInviteUser();
  const deactivateMut = useDeactivateUser();
  const activateMut = useActivateUser();

  const activeDelivery = users.filter((u) => u.estado === 'ACTIVO').length;

  const activeOrderUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const o of orders) {
      if (['CONFIRMADA', 'EN_PREPARACION', 'LISTA', 'EN_CAMINO'].includes(o.estado) && o.deliveryUserId) {
        ids.add(o.deliveryUserId);
      }
    }
    return ids;
  }, [orders]);

  const ordersInRoute = orders.filter((o) => o.estado === 'EN_CAMINO').length;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const ordersDeliveredToday = orders.filter((o) => {
    if (o.estado !== 'ENTREGADA') return false;
    return new Date(o.fecha).getTime() >= today;
  }).length;

  const activeOrdersByUser = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) {
      if (['CONFIRMADA', 'EN_PREPARACION', 'LISTA', 'EN_CAMINO'].includes(o.estado) && o.deliveryUserId) {
        map[o.deliveryUserId] = (map[o.deliveryUserId] || 0) + 1;
      }
    }
    return map;
  }, [orders]);

  const columns: ColumnDef<UserItem>[] = useMemo(() => [
    { accessorKey: 'nombre', header: 'Nombre', cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span> },
    { accessorKey: 'email', header: 'Email' },
    { header: 'Teléfono', cell: () => <span className="text-muted-foreground">—</span> },
    {
      accessorKey: 'estado', header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.estado === 'ACTIVO' ? 'default' : 'secondary'}>
          {row.original.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    { header: 'Vehículo', cell: () => <span className="text-muted-foreground">—</span> },
    {
      id: 'ordenes-activas', header: 'Órdenes activas',
      cell: ({ row }) => activeOrdersByUser[row.original.id] ?? 0,
    },
    {
      id: 'acciones', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.estado === 'ACTIVO' ? (
            <Button size="icon-xs" variant="ghost" onClick={() => setDeactivateTarget(row.original)} title="Desactivar">
              <ShieldOff className="size-3" />
            </Button>
          ) : (
            <Button size="icon-xs" variant="ghost" onClick={() => setActivateTarget(row.original)} title="Activar">
              <ShieldCheck className="size-3" />
            </Button>
          )}
        </div>
      ),
    },
  ], [activeOrdersByUser]);

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    inviteMut.mutate({ nombre: inviteName.trim(), email: inviteEmail.trim(), rol: 'DOMICILIARIO' }, {
      onSuccess: (res) => {
        toast.success('Domiciliario invitado');
        const resp = res as unknown as { temporaryPassword?: string };
        if (resp.temporaryPassword) toast.info(`Contraseña temporal: ${resp.temporaryPassword}`);
        setInviteOpen(false);
        setInviteName('');
        setInviteEmail('');
      },
      onError: (err: Error) => toast.error(err.message || 'Error al invitar domiciliario'),
    });
  }

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Domiciliarios" description="Gestiona los usuarios domiciliarios del negocio.">
        <Button variant="outline" onClick={() => router.push('/admin/delivery/route')}>
          <Route className="size-4 mr-1" /> Ruta de entrega
        </Button>
        <Button onClick={() => { setInviteName(''); setInviteEmail(''); setInviteOpen(true); }}>
          <UserPlus className="size-4 mr-1" /> Agregar domiciliario
        </Button>
      </PageHeader>

      <StaggerList><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Domiciliarios activos" value={activeDelivery} icon={Truck} />
        <StatCard title="Con pedidos activos" value={activeOrderUserIds.size} icon={Bike} />
        <StatCard title="Órdenes en ruta hoy" value={ordersInRoute} icon={Route} />
        <StatCard title="Entregadas hoy" value={ordersDeliveredToday} icon={PackageCheck} />
      </div></StaggerList>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de domiciliarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVO">Activo</SelectItem>
                <SelectItem value="INACTIVO">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Truck className="mb-2 size-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">No se encontraron domiciliarios</p>
              <p className="text-xs text-muted-foreground/70">Agrega el primer domiciliario para comenzar</p>
            </div>
          ) : (
            <DataTable columns={columns} data={users} />
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) { setInviteOpen(false); setInviteName(''); setInviteEmail(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar domiciliario</DialogTitle></DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="inv-nombre">Nombre</Label>
              <Input id="inv-nombre" value={inviteName} onChange={(e) => setInviteName(e.target.value)} required maxLength={160} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={inviteMut.isPending}>
                {inviteMut.isPending ? 'Enviando...' : 'Invitar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}
        title="Desactivar domiciliario"
        description={`¿Desactivar a "${deactivateTarget?.nombre}"? Ya no podrá acceder al sistema ni recibir pedidos.`}
        variant="destructive"
        confirmLabel="Desactivar"
        onConfirm={() => {
          if (!deactivateTarget) return;
          deactivateMut.mutate(deactivateTarget.id, {
            onSuccess: () => { toast.success('Domiciliario desactivado'); setDeactivateTarget(null); },
            onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al desactivar'),
          });
        }}
      />

      <ConfirmDialog
        open={!!activateTarget}
        onOpenChange={(open) => { if (!open) setActivateTarget(null); }}
        title="Activar domiciliario"
        description={`¿Activar a "${activateTarget?.nombre}"? Podrá acceder al sistema nuevamente y recibir pedidos.`}
        confirmLabel="Activar"
        onConfirm={() => {
          if (!activateTarget) return;
          activateMut.mutate(activateTarget.id, {
            onSuccess: () => { toast.success('Domiciliario activado'); setActivateTarget(null); },
            onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al activar'),
          });
        }}
      />
    </FadeIn>
  );
}
