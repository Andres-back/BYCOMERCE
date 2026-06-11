'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { formatCopCentavos } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import { superadminService } from '@/services/superadmin/superadmin.service';
import type { PlanItem } from '@/services/superadmin/superadmin.service';

const planSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  precio: z.number({ error: 'Debe ser un número' }).min(0, 'Debe ser mayor o igual a 0'),
  limiteUsuarios: z.number({ error: 'Debe ser un número' }).min(1, 'Mínimo 1'),
  limiteProductos: z.number({ error: 'Debe ser un número' }).min(1, 'Mínimo 1'),
  almacenamientoGb: z.number({ error: 'Debe ser un número' }).min(0, 'Mínimo 0'),
  caracteristicas: z.array(z.string()).default([]),
});

type PlanFormValues = z.infer<typeof planSchema>;

export default function PlansClient() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanItem | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['superadmin', 'plans'],
    queryFn: () => superadminService.listPlans(token!, true),
    enabled: !!token,
  });

  const createMut = useMutation({
    mutationFn: (data: PlanFormValues) =>
      superadminService.createPlan(token!, {
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        precio: Math.round(data.precio * 100),
        limiteUsuarios: data.limiteUsuarios,
        limiteProductos: data.limiteProductos,
        almacenamientoGb: data.almacenamientoGb || 1,
        caracteristicas: data.caracteristicas.filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'plans'] });
      toast.success('Plan creado correctamente');
      setDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message || 'Error al crear plan'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlanFormValues }) =>
      superadminService.updatePlan(token!, id, {
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        precio: Math.round(data.precio * 100),
        limiteUsuarios: data.limiteUsuarios,
        limiteProductos: data.limiteProductos,
        almacenamientoGb: data.almacenamientoGb,
        caracteristicas: data.caracteristicas.filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'plans'] });
      toast.success('Plan actualizado correctamente');
      setDialogOpen(false);
      setEditingPlan(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar plan'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => superadminService.deletePlan(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'plans'] });
      toast.success('Plan desactivado');
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Error al desactivar plan'),
  });

  const [caracteristicas, setCaracteristicas] = useState<string[]>(['']);

  function appendCaracteristica() { setCaracteristicas((prev) => [...prev, '']); }
  function removeCaracteristica(index: number) { setCaracteristicas((prev) => prev.filter((_, i) => i !== index)); }
  function updateCaracteristica(index: number, value: string) {
    setCaracteristicas((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema) as never,
    defaultValues: {
      nombre: '',
      descripcion: '',
      precio: 0,
      limiteUsuarios: 1,
      limiteProductos: 1,
      almacenamientoGb: 1,
      caracteristicas: [],
    },
  });

  function openCreate() {
    setEditingPlan(null);
    setCaracteristicas(['']);
    form.reset({
      nombre: '',
      descripcion: '',
      precio: 0,
      limiteUsuarios: 1,
      limiteProductos: 1,
      almacenamientoGb: 1,
      caracteristicas: [],
    });
    setDialogOpen(true);
  }

  function openEdit(plan: PlanItem) {
    setEditingPlan(plan);
    const feats = plan.caracteristicas && plan.caracteristicas.length > 0 ? plan.caracteristicas : [''];
    setCaracteristicas(feats);
    form.reset({
      nombre: plan.nombre,
      descripcion: plan.descripcion || '',
      precio: plan.precio / 100,
      limiteUsuarios: plan.limiteUsuarios,
      limiteProductos: plan.limiteProductos,
      almacenamientoGb: plan.almacenamientoGb,
      caracteristicas: [],
    });
    setDialogOpen(true);
  }

  function onSubmit(data: PlanFormValues) {
    const payload = { ...data, caracteristicas: caracteristicas.filter(Boolean) };
    if (editingPlan) {
      updateMut.mutate({ id: editingPlan.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  const columns: ColumnDef<PlanItem>[] = useMemo(() => [
    { accessorKey: 'nombre', header: 'Nombre', cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span> },
    {
      accessorKey: 'precio', header: 'Precio',
      cell: ({ row }) => formatCopCentavos(row.original.precio),
    },
    { accessorKey: 'limiteUsuarios', header: 'Usuarios' },
    { accessorKey: 'limiteProductos', header: 'Productos' },
    {
      accessorKey: 'almacenamientoGb', header: 'Almacenamiento',
      cell: ({ row }) => `${row.original.almacenamientoGb} GB`,
    },
    {
      accessorKey: 'estado', header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.estado === 'ACTIVO' ? 'default' : 'secondary'}>
          {row.original.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      accessorKey: 'caracteristicas', header: 'Características',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(row.original.caracteristicas) ? row.original.caracteristicas.map((c, i) => (
            <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
          )) : null}
        </div>
      ),
    },
    {
      id: 'acciones', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon-xs" variant="ghost" onClick={() => openEdit(row.original)} title="Editar">
            <Pencil className="size-3" />
          </Button>
          <Button size="icon-xs" variant="ghost" onClick={() => setDeleteTarget(row.original)} title="Desactivar">
            <Trash2 className="size-3" />
          </Button>
        </div>
      ),
    },
  ], []);

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Planes" description="Gestiona los planes de suscripción.">
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" /> Crear Plan
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de planes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !plans || plans.length === 0 ? (
            <EmptyState
              title="No hay planes"
              description="Crea el primer plan para comenzar."
            />
          ) : (
            <DataTable columns={columns} data={plans} />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingPlan(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plan' : 'Crear Plan'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...form.register('nombre')} placeholder="Plan Básico" />
              {form.formState.errors.nombre && (
                <p className="text-xs text-destructive">{form.formState.errors.nombre.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Textarea id="descripcion" {...form.register('descripcion')} placeholder="Descripción del plan..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="precio">Precio (COP)</Label>
                <Input id="precio" type="number" step="any" min="0" {...form.register('precio', { valueAsNumber: true })} placeholder="0" />
                {form.formState.errors.precio && (
                  <p className="text-xs text-destructive">{form.formState.errors.precio.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="almacenamientoGb">Almacenamiento (GB)</Label>
                <Input id="almacenamientoGb" type="number" min="0" {...form.register('almacenamientoGb', { valueAsNumber: true })} placeholder="1" />
                {form.formState.errors.almacenamientoGb && (
                  <p className="text-xs text-destructive">{form.formState.errors.almacenamientoGb.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="limiteUsuarios">Límite de Usuarios</Label>
                <Input id="limiteUsuarios" type="number" min="1" {...form.register('limiteUsuarios', { valueAsNumber: true })} placeholder="1" />
                {form.formState.errors.limiteUsuarios && (
                  <p className="text-xs text-destructive">{form.formState.errors.limiteUsuarios.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="limiteProductos">Límite de Productos</Label>
                <Input id="limiteProductos" type="number" min="1" {...form.register('limiteProductos', { valueAsNumber: true })} placeholder="1" />
                {form.formState.errors.limiteProductos && (
                  <p className="text-xs text-destructive">{form.formState.errors.limiteProductos.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Características</Label>
              {caracteristicas.map((val, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={val} onChange={(e) => updateCaracteristica(index, e.target.value)} placeholder={`Característica ${index + 1}`} />
                  <Button type="button" size="icon-xs" variant="ghost" onClick={() => removeCaracteristica(index)} disabled={caracteristicas.length <= 1} title="Eliminar">
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={appendCaracteristica}>
                <Plus className="size-3 mr-1" /> Agregar característica
              </Button>
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : (editingPlan ? 'Guardar' : 'Crear')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Desactivar plan"
        description={`¿Desactivar el plan "${deleteTarget?.nombre}"? Los tenants con este plan no se verán afectados.`}
        variant="destructive"
        confirmLabel="Desactivar"
        onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.id); }}
      />
    </FadeIn>
  );
}
