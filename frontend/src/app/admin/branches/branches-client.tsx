'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Pencil, RefreshCw, Power, PowerOff, MoreHorizontal,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useAuth } from '@/hooks/use-auth';
import { listBranches, createBranch, updateBranch, deactivateBranch, activateBranch } from '@/services/branches/branches.service';
import type { TenantBranch } from '@/services/branches/branches.service';
import { toast } from 'sonner';

const branchSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(120),
  codigo: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  barrio: z.string().optional(),
  ciudad: z.string().min(1, 'Requerido'),
  horarioInicio: z.string().optional(),
  horarioFin: z.string().optional(),
  esPrincipal: z.boolean().optional(),
});
type BranchFormValues = z.infer<typeof branchSchema>;

const estadoBadge: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  ACTIVO: 'default',
  INACTIVO: 'secondary',
};

const estadoLabel: Record<string, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
};

export default function BranchesClient() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [toggleAction, setToggleAction] = useState<'activate' | 'deactivate'>('activate');

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => listBranches(token!),
    enabled: !!token,
  });

  const data: TenantBranch[] = useMemo(() => branches ?? [], [branches]);

  const createMutation = useMutation({
    mutationFn: (input: Partial<TenantBranch>) => createBranch(token!, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); toast.success('Sucursal creada'); },
    onError: () => toast.error('No fue posible crear la sucursal'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TenantBranch> }) => updateBranch(token!, id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); toast.success('Sucursal actualizada'); },
    onError: () => toast.error('No fue posible actualizar la sucursal'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateBranch(token!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); toast.success('Sucursal desactivada'); },
    onError: () => toast.error('No fue posible desactivar la sucursal'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateBranch(token!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); toast.success('Sucursal activada'); },
    onError: () => toast.error('No fue posible activar la sucursal'),
  });

  const editingBranch = editingId ? data.find((b) => b.id === editingId) : null;

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema) as never,
    defaultValues: { nombre: '', codigo: '', direccion: '', telefono: '', barrio: '', ciudad: 'Mocoa', horarioInicio: '', horarioFin: '', esPrincipal: false },
    values: editingBranch ? {
      nombre: editingBranch.nombre,
      codigo: editingBranch.codigo ?? '',
      direccion: editingBranch.direccion ?? '',
      telefono: editingBranch.telefono ?? '',
      barrio: editingBranch.barrio ?? '',
      ciudad: editingBranch.ciudad,
      horarioInicio: editingBranch.horarioInicio ?? '',
      horarioFin: editingBranch.horarioFin ?? '',
      esPrincipal: editingBranch.esPrincipal,
    } : undefined,
  });

  function handleFormOpen(id?: string) {
    if (id) setEditingId(id);
    else { setEditingId(null); form.reset({ nombre: '', codigo: '', direccion: '', telefono: '', barrio: '', ciudad: 'Mocoa', horarioInicio: '', horarioFin: '', esPrincipal: false }); }
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingId(null);
    form.reset({ nombre: '', codigo: '', direccion: '', telefono: '', barrio: '', ciudad: 'Mocoa', horarioInicio: '', horarioFin: '', esPrincipal: false });
  }

  function onSubmit(data: BranchFormValues) {
    const payload: Partial<TenantBranch> = {
      nombre: data.nombre,
      codigo: data.codigo || undefined,
      direccion: data.direccion || undefined,
      telefono: data.telefono || undefined,
      barrio: data.barrio || undefined,
      ciudad: data.ciudad,
      horarioInicio: data.horarioInicio || undefined,
      horarioFin: data.horarioFin || undefined,
      esPrincipal: data.esPrincipal ?? false,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, input: payload }, { onSuccess: () => handleFormClose() });
    } else {
      createMutation.mutate(payload, { onSuccess: () => handleFormClose() });
    }
  }

  function handleToggleConfirm() {
    if (!toggleId) return;
    if (toggleAction === 'activate') {
      activateMutation.mutate(toggleId, { onSuccess: () => setToggleId(null) });
    } else {
      deactivateMutation.mutate(toggleId, { onSuccess: () => setToggleId(null) });
    }
  }

  const isFormPending = createMutation.isPending || updateMutation.isPending;

  const columns: ColumnDef<TenantBranch>[] = [
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{row.original.nombre}</span>
        </div>
      ),
    },
    {
      accessorKey: 'codigo',
      header: 'Codigo',
      cell: ({ row }) => row.original.codigo ?? '-',
    },
    {
      accessorKey: 'ciudad',
      header: 'Ciudad',
    },
    {
      accessorKey: 'telefono',
      header: 'Telefono',
      cell: ({ row }) => row.original.telefono ?? '-',
    },
    {
      accessorKey: 'esPrincipal',
      header: 'Principal',
      cell: ({ row }) => row.original.esPrincipal ? <Badge>Principal</Badge> : <Badge variant="secondary">Secundaria</Badge>,
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={estadoBadge[row.original.estado] ?? 'outline'}>
          {estadoLabel[row.original.estado] ?? row.original.estado}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-center rounded-md p-1 hover:bg-accent">
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleFormOpen(row.original.id)}>
              <Pencil className="size-4" /> Editar
            </DropdownMenuItem>
            {row.original.estado === 'ACTIVO' ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => { setToggleId(row.original.id); setToggleAction('deactivate'); }}
              >
                <PowerOff className="size-4" /> Desactivar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => { setToggleId(row.original.id); setToggleAction('activate'); }}>
                <Power className="size-4" /> Activar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Sucursales" description="Gestiona las sucursales del negocio.">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => qc.invalidateQueries({ queryKey: ['branches'] })} title="Actualizar">
            <RefreshCw className="size-4" />
          </Button>
          <Button onClick={() => handleFormOpen()} size="sm">
            <Plus className="size-4 mr-1" /> Nueva Sucursal
          </Button>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Building2 className="mx-auto size-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No hay sucursales registradas.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={data} />
      )}

      <Dialog open={formOpen} onOpenChange={(open: boolean) => { if (!open) handleFormClose(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Actualiza los datos de la sucursal.' : 'Ingresa los datos de la nueva sucursal.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" {...form.register('nombre')} />
                {form.formState.errors.nombre && <p className="text-xs text-destructive">{form.formState.errors.nombre.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="codigo">Codigo</Label>
                <Input id="codigo" {...form.register('codigo')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="direccion">Direccion</Label>
                <Input id="direccion" {...form.register('direccion')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="telefono">Telefono</Label>
                <Input id="telefono" {...form.register('telefono')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="barrio">Barrio</Label>
                <Input id="barrio" {...form.register('barrio')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input id="ciudad" {...form.register('ciudad')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="horarioInicio">Horario apertura</Label>
                <Input id="horarioInicio" type="time" {...form.register('horarioInicio')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="horarioFin">Horario cierre</Label>
                <Input id="horarioFin" type="time" {...form.register('horarioFin')} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="esPrincipal" checked={form.watch('esPrincipal') ?? false} onCheckedChange={(v) => form.setValue('esPrincipal', v)} />
              <Label htmlFor="esPrincipal">Sucursal principal</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleFormClose} disabled={isFormPending}>Cancelar</Button>
              <Button type="submit" disabled={isFormPending}>{isFormPending ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear sucursal'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toggleId}
        onOpenChange={(open) => { if (!open) setToggleId(null); }}
        title={toggleAction === 'activate' ? 'Activar sucursal' : 'Desactivar sucursal'}
        description={
          toggleAction === 'activate'
            ? 'La sucursal estara disponible para operaciones.'
            : 'La sucursal no estara disponible. No se puede desactivar la sucursal principal.'
        }
        confirmLabel={toggleAction === 'activate' ? 'Activar' : 'Desactivar'}
        variant={toggleAction === 'deactivate' ? 'destructive' : 'default'}
        onConfirm={handleToggleConfirm}
      />
    </FadeIn>
  );
}
