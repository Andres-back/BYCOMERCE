'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Mail, RefreshCw, UserPlus, Pencil, ShieldOff, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { roleLabels } from '@/lib/format';
import { formatDate } from '@/lib/format';
import { useUsers, useInviteUser, useUpdateUser, useDeactivateUser, useActivateUser } from '@/hooks/use-users';
import type { UserItem } from '@/services/users/users.service';

const ROLES = ['ADMIN_NEGOCIO', 'SUPERVISOR', 'CAJERO', 'DOMICILIARIO'] as const;

const ROLE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  ADMIN_NEGOCIO: 'default',
  SUPERVISOR: 'secondary',
  CAJERO: 'outline',
  DOMICILIARIO: 'outline',
};

const inviteSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(160),
  email: z.string().min(1, 'Requerido').email('Email inválido').max(180),
  rol: z.enum(ROLES),
  temporaryPassword: z.string().optional(),
});
type InviteForm = z.infer<typeof inviteSchema>;

const editSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(160),
  email: z.string().min(1, 'Requerido').email('Email inválido').max(180),
  rol: z.enum(ROLES),
  newPassword: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

export default function UsersClient() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UserItem | null>(null);
  const [activateTarget, setActivateTarget] = useState<UserItem | null>(null);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.q = search;
    if (roleFilter !== 'all') f.rol = roleFilter;
    if (statusFilter !== 'all') f.estado = statusFilter;
    return f;
  }, [search, roleFilter, statusFilter]);

  const { data: usersData, isLoading } = useUsers(filters);
  const users = usersData?.data ?? [];
  const inviteMut = useInviteUser();
  const updateMut = useUpdateUser();
  const deactivateMut = useDeactivateUser();
  const activateMut = useActivateUser();

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { nombre: '', email: '', rol: 'CAJERO', temporaryPassword: '' },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  function openEdit(user: UserItem) {
    setEditingUser(user);
    editForm.reset({ nombre: user.nombre, email: user.email, rol: user.rol as InviteForm['rol'], newPassword: '' });
    setEditOpen(true);
  }

  function handleInvite(data: InviteForm) {
    inviteMut.mutate({ nombre: data.nombre, email: data.email, rol: data.rol, temporaryPassword: data.temporaryPassword || undefined }, {
      onSuccess: (res) => {
        toast.success('Usuario invitado');
        const resp = res as unknown as { temporaryPassword?: string };
        if (resp.temporaryPassword) toast.info(`Contraseña temporal: ${resp.temporaryPassword}`);
        inviteForm.reset();
        setInviteOpen(false);
      },
      onError: (err: Error) => toast.error(err.message || 'Error al invitar usuario'),
    });
  }

  function handleEdit(data: EditForm) {
    if (!editingUser) return;
    updateMut.mutate({ id: editingUser.id, input: { nombre: data.nombre, email: data.email, rol: data.rol, newPassword: data.newPassword || undefined } }, {
      onSuccess: () => { toast.success('Usuario actualizado'); setEditOpen(false); setEditingUser(null); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al actualizar usuario'),
    });
  }

  const columns: ColumnDef<UserItem>[] = useMemo(() => [
    { accessorKey: 'nombre', header: 'Nombre', cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span> },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'rol', header: 'Rol',
      cell: ({ row }) => <Badge variant={ROLE_BADGE_VARIANT[row.original.rol] ?? 'outline'}>{roleLabels[row.original.rol] ?? row.original.rol}</Badge>,
    },
    {
      accessorKey: 'estado', header: 'Estado',
      cell: ({ row }) => <Badge variant={row.original.estado === 'ACTIVO' ? 'default' : 'secondary'}>{row.original.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</Badge>,
    },
    { accessorKey: 'createdAt', header: 'Fecha', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'acciones', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon-xs" variant="ghost" onClick={() => openEdit(row.original)} title="Editar"><Pencil className="size-3" /></Button>
          {row.original.estado === 'ACTIVO' ? (
            <Button size="icon-xs" variant="ghost" onClick={() => setDeactivateTarget(row.original)} title="Desactivar"><ShieldOff className="size-3" /></Button>
          ) : (
            <Button size="icon-xs" variant="ghost" onClick={() => setActivateTarget(row.original)} title="Activar"><ShieldCheck className="size-3" /></Button>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Usuarios" description="Gestiona los usuarios del negocio.">
        <Button onClick={() => { inviteForm.reset({ nombre: '', email: '', rol: 'CAJERO', temporaryPassword: '' }); setInviteOpen(true); }}>
          <UserPlus className="size-4 mr-1" /> Invitar usuario
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? 'all')}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Rol" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
              </SelectContent>
            </Select>
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
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="mb-2 size-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
              <p className="text-xs text-muted-foreground/70">Invita al primer usuario para comenzar</p>
            </div>
          ) : (
            <DataTable columns={columns} data={users} />
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invitar usuario</DialogTitle></DialogHeader>
          <form onSubmit={inviteForm.handleSubmit(handleInvite)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="inv-nombre">Nombre</Label>
              <Input id="inv-nombre" {...inviteForm.register('nombre')} />
              {inviteForm.formState.errors.nombre && <p className="text-xs text-destructive">{inviteForm.formState.errors.nombre.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" {...inviteForm.register('email')} />
              {inviteForm.formState.errors.email && <p className="text-xs text-destructive">{inviteForm.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-rol">Rol</Label>
              <Select value={inviteForm.watch('rol')} onValueChange={(v) => { if (v !== null) inviteForm.setValue('rol', v as InviteForm['rol'], { shouldValidate: true }); }}>
                <SelectTrigger id="inv-rol" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent>
              </Select>
              {inviteForm.formState.errors.rol && <p className="text-xs text-destructive">{inviteForm.formState.errors.rol.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-password">Contraseña temporal (opcional)</Label>
              <Input id="inv-password" type="password" {...inviteForm.register('temporaryPassword')} placeholder="Se generará automáticamente si se deja vacío" />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={inviteMut.isPending}>{inviteMut.isPending ? 'Enviando...' : 'Invitar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open: boolean) => { if (!open) { setEditOpen(false); setEditingUser(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar usuario</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-nombre">Nombre</Label>
              <Input id="edit-nombre" {...editForm.register('nombre')} />
              {editForm.formState.errors.nombre && <p className="text-xs text-destructive">{editForm.formState.errors.nombre.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" {...editForm.register('email')} />
              {editForm.formState.errors.email && <p className="text-xs text-destructive">{editForm.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-rol">Rol</Label>
              <Select value={editForm.watch('rol')} onValueChange={(v) => { if (v !== null) editForm.setValue('rol', v as EditForm['rol'], { shouldValidate: true }); }}>
                <SelectTrigger id="edit-rol" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-password">Nueva contraseña (opcional)</Label>
              <Input id="edit-password" type="password" {...editForm.register('newPassword')} placeholder="Dejar vacío para no cambiar" />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={updateMut.isPending}>{updateMut.isPending ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open: boolean) => { if (!open) setDeactivateTarget(null); }}
        title="Desactivar usuario"
        description={`¿Desactivar a "${deactivateTarget?.nombre}"? Ya no podrá acceder al sistema.`}
        variant="destructive"
        confirmLabel="Desactivar"
        onConfirm={() => {
          if (!deactivateTarget) return;
          deactivateMut.mutate(deactivateTarget.id, {
            onSuccess: () => { toast.success('Usuario desactivado'); setDeactivateTarget(null); },
            onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al desactivar'),
          });
        }}
      />

      <ConfirmDialog
        open={!!activateTarget}
        onOpenChange={(open: boolean) => { if (!open) setActivateTarget(null); }}
        title="Activar usuario"
        description={`¿Activar a "${activateTarget?.nombre}"? Podrá acceder al sistema nuevamente.`}
        confirmLabel="Activar"
        onConfirm={() => {
          if (!activateTarget) return;
          activateMut.mutate(activateTarget.id, {
            onSuccess: () => { toast.success('Usuario activado'); setActivateTarget(null); },
            onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al activar'),
          });
        }}
      />
    </FadeIn>
  );
}