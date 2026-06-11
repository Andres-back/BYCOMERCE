'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import {
  Building2, Search, UserPlus, RefreshCw, Eye, Ban, CheckCircle,
  ShieldOff, ShieldCheck, Store, ShoppingBag, UtensilsCrossed, Pill, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { superadminService } from '@/services/superadmin/superadmin.service';
import { TIPO_NEGOCIO_PRESETS, getBusinessTypes } from '@/services/business-types/business-types.service';
import { formatDate, formatNumber, formatCopCentavos } from '@/lib/format';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';

const ESTADO_BADGE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVO: 'default',
  SUSPENDIDO: 'destructive',
  PENDIENTE: 'secondary',
  CANCELADO: 'outline',
};

const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  PENDIENTE: 'Pendiente',
  CANCELADO: 'Cancelado',
};

const TIPO_NEGOCIO = TIPO_NEGOCIO_PRESETS.map((t) => t.id);

const createSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(160),
  slug: z.string().min(1, 'Requerido').max(200),
  tipoNegocio: z.enum(TIPO_NEGOCIO),
  planId: z.string().min(1, 'Selecciona un plan'),
  adminNombre: z.string().min(1, 'Requerido').max(160),
  adminEmail: z.string().min(1, 'Requerido').email('Email invalido').max(180),
  adminPassword: z.string().min(6, 'Minimo 6 caracteres').max(100),
  telefono: z.string().max(30).optional().or(z.literal('')),
  direccion: z.string().max(300).optional().or(z.literal('')),
  barrio: z.string().max(200).optional().or(z.literal('')),
  ciudad: z.string().max(100).optional().or(z.literal('')),
  diasPrueba: z.number().min(0).max(365).optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function TenantsClient() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ tenant: { nombre: string; slug: string }; admin: { nombre: string; email: string }; password: string } | null>(null);

  const params = useMemo(() => {
    const p: { q?: string; estado?: string; page?: number; pageSize?: number } = { page, pageSize: 10 };
    if (search) p.q = search;
    if (estadoFilter !== 'all') p.estado = estadoFilter;
    return p;
  }, [search, estadoFilter, page]);

  const tenantsQuery = useQuery({
    queryKey: ['superadmin', 'tenants', params],
    queryFn: () => superadminService.listTenants(token!, params),
    enabled: !!token,
  });

  const plansQuery = useQuery({
    queryKey: ['superadmin', 'plans', 'active'],
    queryFn: () => superadminService.listPlans(token!, true),
    enabled: !!token,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateForm) => superadminService.createTenant(token!, data),
    onSuccess: (res) => {
      toast.success('Tenant creado exitosamente');
      setCreatedCredentials(res);
      qc.invalidateQueries({ queryKey: ['superadmin', 'tenants'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Error al crear tenant'),
  });

  const suspendMut = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => superadminService.suspendTenant(token!, id, motivo),
    onSuccess: () => { toast.success('Tenant suspendido'); qc.invalidateQueries({ queryKey: ['superadmin', 'tenants'] }); },
    onError: (err: Error) => toast.error(err.message || 'Error al suspender'),
  });

  const reactivateMut = useMutation({
    mutationFn: (id: string) => superadminService.reactivateTenant(token!, id),
    onSuccess: () => { toast.success('Tenant reactivado'); qc.invalidateQueries({ queryKey: ['superadmin', 'tenants'] }); },
    onError: (err: Error) => toast.error(err.message || 'Error al reactivar'),
  });

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      nombre: '', slug: '', tipoNegocio: 'tienda', planId: '',
      adminNombre: '', adminEmail: '', adminPassword: '',
      telefono: '', direccion: '', barrio: '', ciudad: '',
      diasPrueba: 14,
    },
  });

  const watchNombre = createForm.watch('nombre');

  function autoGenerateSlug(name: string) {
    return name.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() || '';
  }

  function handleCreate(data: CreateForm) {
    createMut.mutate({
      ...data,
      telefono: data.telefono || undefined,
      direccion: data.direccion || undefined,
      barrio: data.barrio || undefined,
      ciudad: data.ciudad || undefined,
      diasPrueba: data.diasPrueba ?? 14,
    });
  }

  const tenantsData = tenantsQuery.data;
  const tenants = tenantsData?.data ?? [];
  const plans = plansQuery.data ?? [];
  const totalPages = tenantsData ? Math.ceil(tenantsData.total / tenantsData.pageSize) : 0;
  const isLoading = tenantsQuery.isLoading;

  const columns: ColumnDef<typeof tenants[0]>[] = useMemo(() => [
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <Link href={`/admin/superadmin/tenants/${row.original.id}`} className="font-medium hover:underline">
          {row.original.nombre}
        </Link>
      ),
    },
    { accessorKey: 'slug', header: 'Slug' },
    {
      accessorKey: 'tipoNegocio',
      header: 'Tipo',
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.tipoNegocio}</span>,
    },
    {
      accessorKey: 'plan',
      header: 'Plan',
      cell: ({ row }) => <span className="text-xs">{row.original.plan?.nombre ?? '—'}</span>,
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <Badge variant={ESTADO_BADGE[row.original.estado] ?? 'outline'}>{ESTADO_LABEL[row.original.estado] ?? row.original.estado}</Badge>,
    },
    {
      header: 'Usuarios',
      cell: ({ row }) => formatNumber(row.original._count?.users ?? 0),
    },
    {
      header: 'Productos',
      cell: ({ row }) => formatNumber(row.original._count?.products ?? 0),
    },
    {
      header: 'Ventas',
      cell: ({ row }) => formatNumber(row.original._count?.sales ?? 0),
    },
    {
      accessorKey: 'createdAt',
      header: 'Creado',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <Link href={`/admin/superadmin/tenants/${row.original.id}`}>
            <Button size="icon-xs" variant="ghost" title="Ver detalle"><Eye className="size-3" /></Button>
          </Link>
          {row.original.estado === 'ACTIVO' || row.original.estado === 'PENDIENTE' ? (
            <Button size="icon-xs" variant="ghost" onClick={() => setSuspendTarget({ id: row.original.id, nombre: row.original.nombre })} title="Suspender">
              <ShieldOff className="size-3" />
            </Button>
          ) : (
            <Button size="icon-xs" variant="ghost" onClick={() => setReactivateTarget({ id: row.original.id, nombre: row.original.nombre })} title="Reactivar">
              <ShieldCheck className="size-3" />
            </Button>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Tenants" description="Gestion de negocios registrados en la plataforma">
        <Button onClick={() => { createForm.reset({ nombre: '', slug: '', tipoNegocio: 'tienda', planId: '', adminNombre: '', adminEmail: '', adminPassword: '', telefono: '', direccion: '', barrio: '', ciudad: '', diasPrueba: 14 }); setCreateOpen(true); }}>
          <Building2 className="size-4 mr-1" /> Crear Tenant
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nombre o slug..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={estadoFilter} onValueChange={(v) => { if (v !== null) { setEstadoFilter(v); setPage(1); } }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVO">Activo</SelectItem>
                <SelectItem value="SUSPENDIDO">Suspendido</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => tenantsQuery.refetch()} disabled={isLoading} title="Actualizar">
              <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
          ) : tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="mb-2 size-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">No se encontraron tenants</p>
              <p className="text-xs text-muted-foreground/70">Crea el primer tenant para comenzar</p>
            </div>
          ) : (
            <>
              <DataTable columns={columns} data={tenants} />
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Pagina {page} de {totalPages} ({tenantsData?.total} registros)
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          text="Anterior"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink
                            isActive={p === page}
                            onClick={() => setPage(p)}
                            className="cursor-pointer"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          text="Siguiente"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Tenant</DialogTitle>
            <DialogDescription>Registra un nuevo negocio con su administrador.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-1">
              <Label htmlFor="c-nombre">Nombre del negocio</Label>
              <Input
                id="c-nombre"
                {...createForm.register('nombre')}
                onChange={(e) => {
                  createForm.setValue('nombre', e.target.value);
                  if (!createForm.formState.dirtyFields.slug) {
                    createForm.setValue('slug', autoGenerateSlug(e.target.value));
                  }
                }}
              />
              {createForm.formState.errors.nombre && <p className="text-xs text-destructive">{createForm.formState.errors.nombre.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-slug">Slug</Label>
              <Input id="c-slug" {...createForm.register('slug')} />
              {createForm.formState.errors.slug && <p className="text-xs text-destructive">{createForm.formState.errors.slug.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Tipo de negocio</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TIPO_NEGOCIO_PRESETS.map((preset) => {
                  const Icon = preset.id === 'tienda' ? Store : preset.id === 'zapateria' ? ShoppingBag : preset.id === 'restaurante' ? UtensilsCrossed : preset.id === 'ferreteria' ? Wrench : Building2;
                  const selected = createForm.watch('tipoNegocio') === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => createForm.setValue('tipoNegocio', preset.id as CreateForm['tipoNegocio'], { shouldValidate: true })}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all ${
                        selected ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`flex size-10 items-center justify-center rounded-full ${selected ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        <Icon className="size-5" />
                      </div>
                      <span className={`text-xs font-medium ${selected ? 'text-teal-800' : 'text-gray-700'}`}>{preset.label}</span>
                      <span className="text-[10px] text-gray-400">{preset.desc}</span>
                    </button>
                  );
                })}
              </div>
              {createForm.formState.errors.tipoNegocio && <p className="text-xs text-destructive">{createForm.formState.errors.tipoNegocio.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="c-plan">Plan</Label>
                <Select value={createForm.watch('planId')} onValueChange={(v) => { if (v !== null) createForm.setValue('planId', v, { shouldValidate: true }); }}>
                  <SelectTrigger id="c-plan"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre} - {formatCopCentavos(p.precio)}/mes</SelectItem>)}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.planId && <p className="text-xs text-destructive">{createForm.formState.errors.planId.message}</p>}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Administrador</p>
              <div className="space-y-1">
                <Label htmlFor="c-admin-nombre">Nombre</Label>
                <Input id="c-admin-nombre" {...createForm.register('adminNombre')} />
                {createForm.formState.errors.adminNombre && <p className="text-xs text-destructive">{createForm.formState.errors.adminNombre.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="c-admin-email">Email</Label>
                  <Input id="c-admin-email" type="email" {...createForm.register('adminEmail')} />
                  {createForm.formState.errors.adminEmail && <p className="text-xs text-destructive">{createForm.formState.errors.adminEmail.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-admin-password">Contrasena</Label>
                  <Input id="c-admin-password" type="password" {...createForm.register('adminPassword')} />
                  {createForm.formState.errors.adminPassword && <p className="text-xs text-destructive">{createForm.formState.errors.adminPassword.message}</p>}
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Informacion adicional (opcional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="c-telefono">Telefono</Label>
                  <Input id="c-telefono" {...createForm.register('telefono')} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-ciudad">Ciudad</Label>
                  <Input id="c-ciudad" {...createForm.register('ciudad')} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-direccion">Direccion</Label>
                <Input id="c-direccion" {...createForm.register('direccion')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="c-barrio">Barrio</Label>
                  <Input id="c-barrio" {...createForm.register('barrio')} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-dias">Dias de prueba</Label>
                  <Input id="c-dias" type="number" min={0} max={365} {...createForm.register('diasPrueba', { valueAsNumber: true })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? 'Creando...' : 'Crear Tenant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCredentials} onOpenChange={(open) => { if (!open) setCreatedCredentials(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tenant creado exitosamente</DialogTitle>
            <DialogDescription>Credenciales del administrador - guardalas en un lugar seguro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">NEGOCIO</p>
              <p className="text-sm font-medium">{createdCredentials?.tenant.nombre}</p>
              <p className="text-xs text-muted-foreground">Slug: {createdCredentials?.tenant.slug}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">ADMINISTRADOR</p>
              <p className="text-sm font-medium">{createdCredentials?.admin.nombre}</p>
              <p className="text-xs text-muted-foreground">Email: {createdCredentials?.admin.email}</p>
            </div>
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Contrasena temporal</p>
              <p className="mt-1 font-mono text-sm font-bold tracking-wider text-amber-800 dark:text-amber-300 select-all">
                {createdCredentials?.password}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedCredentials(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!suspendTarget}
        onOpenChange={(open) => { if (!open) setSuspendTarget(null); }}
        title="Suspender Tenant"
        description={`Suspender a "${suspendTarget?.nombre}"? El negocio y sus usuarios no podran acceder.`}
        variant="destructive"
        confirmLabel="Suspender"
        onConfirm={() => {
          if (!suspendTarget) return;
          suspendMut.mutate({ id: suspendTarget.id }, {
            onSettled: () => setSuspendTarget(null),
          });
        }}
      />

      <ConfirmDialog
        open={!!reactivateTarget}
        onOpenChange={(open) => { if (!open) setReactivateTarget(null); }}
        title="Reactivar Tenant"
        description={`Reactivar a "${reactivateTarget?.nombre}"? El negocio recuperara el acceso.`}
        confirmLabel="Reactivar"
        onConfirm={() => {
          if (!reactivateTarget) return;
          reactivateMut.mutate(reactivateTarget.id, {
            onSettled: () => setReactivateTarget(null),
          });
        }}
      />
    </FadeIn>
  );
}
