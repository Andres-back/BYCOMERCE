'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Crown,
  History,
  Mail,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  UserPlus,
  Users,
  X,
  Award,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { PageHeader } from '@/components/layouts/page-header';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { StatCard } from '@/components/shared/stat-card';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { formatCopCentavos, formatDate } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import {
  useCustomers,
  useCustomerHistory,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '@/hooks/use-customers';
import { useCustomersReport } from '@/hooks/use-reports';
import { listCustomers } from '@/services/customers/customers.service';
import { getCustomerPoints } from '@/services/loyalty/loyalty.service';
import type { CustomerSegment, CustomerWithStats } from '@/types/api';

const segmentLabels: Record<CustomerSegment | 'TODOS', string> = {
  TODOS: 'Todos',
  NUEVO: 'Nuevo',
  FRECUENTE: 'Frecuente',
  VIP: 'VIP',
  INACTIVO: 'Inactivo',
};

const segmentBadgeVariant: Record<CustomerSegment, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  NUEVO: 'secondary',
  FRECUENTE: 'outline',
  VIP: 'default',
  INACTIVO: 'destructive',
};

const customerSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(120),
  telefono: z.string().min(1, 'Requerido').max(30),
  email: z.string().optional(),
  direccion: z.string().optional(),
  observaciones: z.string().optional(),
});
type CustomerFormValues = z.infer<typeof customerSchema>;

const TAG_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
];

function parseTags(observaciones?: string | null): string[] {
  if (!observaciones) return [];
  const matches = observaciones.match(/#\w+/g);
  if (!matches) return [];
  return [...new Set(matches.map((t) => t.replace('#', '')))];
}

function removeTags(observaciones?: string | null): string {
  if (!observaciones) return '';
  return observaciones.replace(/#\w+/g, '').trim();
}

function buildObservaciones(tags: string[], notes: string): string {
  const tagStr = tags.map((t) => `#${t}`).join(' ');
  const parts = [tagStr, notes].filter(Boolean);
  return parts.join('\n');
}

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function CustomersClient() {
  const { token } = useAuth();

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<CustomerSegment | 'TODOS'>('TODOS');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');

  const monthRange = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const to = now.toISOString().split('T')[0];
    return { from, to };
  }, []);

  const { data: customerListResponse, isLoading } = useCustomers(token!, page, query || undefined, segment);
  const customers: CustomerWithStats[] = useMemo(() => customerListResponse?.data ?? [], [customerListResponse]);
  const pagination = customerListResponse?.pagination;

  const { data: customersReport } = useCustomersReport({ from: monthRange.from, to: monthRange.to });
  const { data: vipResponse } = useQuery({
    queryKey: ['customers', 'segment-count', 'VIP'],
    queryFn: () => listCustomers(token!, { segment: 'VIP', page: 1, pageSize: 1 }),
    enabled: !!token,
  });
  const { data: freqResponse } = useQuery({
    queryKey: ['customers', 'segment-count', 'FRECUENTE'],
    queryFn: () => listCustomers(token!, { segment: 'FRECUENTE', page: 1, pageSize: 1 }),
    enabled: !!token,
  });

  const { data: detail } = useCustomerHistory(token!, detailId ?? '');

  const { data: customerPoints } = useQuery({
    queryKey: ['customer-points', detailId],
    queryFn: () => getCustomerPoints(token!, detailId!),
    enabled: !!token && !!detailId,
  });

  useEffect(() => {
    if (detail) {
      window.setTimeout(() => {
        setTags(parseTags(detail.observaciones));
        setNotes(removeTags(detail.observaciones));
        setTagInput('');
      }, 0);
    }
  }, [detail]);

  const createMutation = useCreateCustomer(token!);
  const updateMutation = useUpdateCustomer(token!);
  const deleteMutation = useDeleteCustomer(token!);

  const editingCustomer = editingId
    ? customers.find((c) => c.id === editingId)
    : null;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as never,
    defaultValues: { nombre: '', telefono: '', email: '', direccion: '', observaciones: '' },
    values: editingCustomer
      ? {
          nombre: editingCustomer.nombre,
          telefono: editingCustomer.telefono,
          email: editingCustomer.email ?? '',
          direccion: editingCustomer.direccion ?? '',
          observaciones: editingCustomer.observaciones ?? '',
        }
      : undefined,
  });

  function handleFormOpen(customerId?: string) {
    if (customerId) {
      setEditingId(customerId);
    } else {
      setEditingId(null);
      form.reset({ nombre: '', telefono: '', email: '', direccion: '', observaciones: '' });
    }
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingId(null);
    form.reset({ nombre: '', telefono: '', email: '', direccion: '', observaciones: '' });
  }

  function onSubmit(data: CustomerFormValues) {
    const payload = {
      nombre: data.nombre,
      telefono: data.telefono,
      email: data.email || undefined,
      direccion: data.direccion || undefined,
      observaciones: data.observaciones || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, input: payload }, {
        onSuccess: () => handleFormClose(),
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => handleFormClose(),
      });
    }
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  }

  function handleAddTag() {
    const tag = tagInput.trim().replace(/^#/, '');
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleSaveDetailNotes() {
    if (!detail) return;
    updateMutation.mutate({
      id: detail.id,
      input: {
        observaciones: buildObservaciones(tags, notes) || undefined,
      },
    });
  }

  const columns: ColumnDef<CustomerWithStats>[] = [
      {
        accessorKey: 'nombre',
        header: 'Nombre',
        cell: ({ row }) => (
          <button
            type="button"
            className="flex items-center gap-3 text-left"
            onClick={() => setDetailId(row.original.id)}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/10">
              {getInitials(row.original.nombre)}
            </span>
            <span className="font-semibold text-foreground hover:underline">{row.original.nombre}</span>
          </button>
        ),
      },
      {
        accessorKey: 'telefono',
        header: 'Telefono',
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email ?? '-',
      },
      {
        accessorKey: 'stats.segment',
        header: 'Segmento',
        cell: ({ row }) => (
          <Badge variant={segmentBadgeVariant[row.original.stats.segment]}>
            {segmentLabels[row.original.stats.segment]}
          </Badge>
        ),
      },
      {
        id: 'purchases',
        header: 'Compras',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{formatCopCentavos(row.original.stats.totalSpent)}</p>
            <p className="text-xs text-muted-foreground">{row.original.stats.purchases} compras</p>
          </div>
        ),
      },
      {
        id: 'lastPurchase',
        header: 'Ultima compra',
        cell: ({ row }) => {
          const lastDate = row.original.stats.lastPurchaseAt;
          return lastDate ? formatDate(lastDate) : '-';
        },
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
              <DropdownMenuItem onClick={() => setDetailId(row.original.id)}>
                <History className="size-4" /> Historial
              </DropdownMenuItem>
              {(row.original.latitud && row.original.longitud) ? (
                <DropdownMenuItem onClick={() => window.open(`https://www.google.com/maps?q=${row.original.latitud},${row.original.longitud}`, '_blank')}>
                  <MapPin className="size-4" /> Ver en mapa
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => window.open(`https://wa.me/${row.original.telefono.replace(/\D/g, '')}`, '_blank')}>
                <MessageCircle className="size-4" /> Enviar WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(row.original.id)}>
                <Trash2 className="size-4" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ];

  const isFormPending = createMutation.isPending || updateMutation.isPending;

  const statCards = [
    { title: 'Total clientes', value: customersReport?.total ?? 0, icon: Users },
    { title: 'Nuevos este mes', value: customersReport?.newCustomers ?? 0, icon: UserPlus },
    { title: 'Frecuentes', value: freqResponse?.pagination?.totalItems ?? 0, icon: Star },
    { title: 'VIP', value: vipResponse?.pagination?.totalItems ?? 0, icon: Crown },
  ];

  const transactions = useMemo(() => {
    if (!detail) return [];
    const all = [
      ...(detail.sales ?? []).map((s) => ({
        id: s.id,
        fecha: s.fecha,
        total: s.total,
        tipo: 'POS' as const,
        metodo: s.metodoPago,
      })),
      ...(detail.orders ?? []).map((o) => ({
        id: o.id,
        fecha: o.fecha,
        total: o.total,
        tipo: 'Delivery' as const,
        metodo: o.metodoPago,
      })),
    ];
    return all
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 5);
  }, [detail]);

  return (
    <FadeIn as="main" className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Clientes" description="Gestiona los clientes del negocio.">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => {
            setPage(1);
          }} title="Actualizar">
            <RefreshCw className="size-4" />
          </Button>
          <Button onClick={() => handleFormOpen()} size="sm">
            <Plus className="size-4 mr-1" /> Nuevo Cliente
          </Button>
        </div>
      </PageHeader>

      <StaggerList><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} />
        ))}
      </div></StaggerList>

      <FadeIn delay={0.2}><div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {(Object.keys(segmentLabels) as Array<CustomerSegment | 'TODOS'>).map((key) => (
              <Button
                key={key}
                variant={segment === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSegment(key); setPage(1); }}
              >
                {segmentLabels[key]}
              </Button>
            ))}
          </div>
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar nombre, telefono o email..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="admin-card rounded-xl">
            <EmptyState
              icon={<Users className="size-9" />}
              title="No se encontraron clientes"
              description="Crea un cliente o ajusta los filtros para ver resultados."
              action={<Button onClick={() => handleFormOpen()}><Plus className="mr-1 size-4" />Nuevo cliente</Button>}
            />
          </div>
        ) : (
          <DataTable columns={columns} data={customers} />
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} a {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} de {pagination.totalItems}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div></FadeIn>

      <Dialog open={formOpen} onOpenChange={(open: boolean) => { if (!open) handleFormClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Actualiza los datos del cliente.' : 'Ingresa los datos del nuevo cliente.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" {...form.register('nombre')} />
                {form.formState.errors.nombre && (
                  <p className="text-xs text-destructive">{form.formState.errors.nombre.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="telefono">Telefono</Label>
                <Input id="telefono" {...form.register('telefono')} />
                {form.formState.errors.telefono && (
                  <p className="text-xs text-destructive">{form.formState.errors.telefono.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="direccion">Direccion</Label>
                <Input id="direccion" {...form.register('direccion')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea id="observaciones" {...form.register('observaciones')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleFormClose} disabled={isFormPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isFormPending}>
                {isFormPending ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detailId} onOpenChange={(open: boolean) => { if (!open) setDetailId(null); }}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Badge variant={segmentBadgeVariant[detail.stats.segment]}>
                    {segmentLabels[detail.stats.segment]}
                  </Badge>
                </div>
                <SheetTitle>{detail.nombre}</SheetTitle>
                <SheetDescription>
                  Cliente desde {detail.createdAt ? formatDate(detail.createdAt) : 'fecha no disponible'}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <span>
                      <a
                        href={`https://wa.me/${detail.telefono.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {detail.telefono}
                      </a>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{detail.email ?? 'Sin email'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{detail.direccion ?? 'Sin direccion'}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Etiquetas</h4>
                  <div className="flex flex-wrap gap-1.5 min-h-7">
                    {tags.length === 0 && (
                      <span className="text-xs text-muted-foreground">Sin etiquetas</span>
                    )}
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        className={`cursor-pointer gap-1 ${getTagColor(tag)}`}
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag} <X className="size-3" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nueva etiqueta..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                      className="h-8 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0"
                      onClick={handleAddTag}
                      disabled={!tagInput.trim()}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Notas</h4>
                  <Textarea
                    placeholder="Notas sobre el cliente..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDetailNotes}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar notas'}
                  </Button>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Total gastado</p>
                    <p className="text-lg font-semibold">{formatCopCentavos(detail.stats.totalSpent)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Ticket promedio</p>
                    <p className="text-lg font-semibold">{formatCopCentavos(detail.stats.averageTicket)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Compras POS</p>
                    <p className="text-lg font-semibold">{detail.stats.salesCount}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Pedidos entregados</p>
                    <p className="text-lg font-semibold">{detail.stats.deliveredOrdersCount}</p>
                  </div>
                </div>

                {customerPoints && (
                  <div className="rounded-lg border p-3 flex items-center gap-3">
                    <Award className="size-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{customerPoints.totalPuntos.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Puntos de fidelización
                        {customerPoints.tier && (
                          <span className="ml-1 inline-flex items-center gap-1">
                            -
                            <span
                              className="inline-block size-2.5 rounded-full"
                              style={{ backgroundColor: customerPoints.tier.color ?? '#6B7280' }}
                            />
                            {customerPoints.tier.nombre}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {transactions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Ultimas transacciones</h4>
                    <div className="space-y-1">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <Badge variant={tx.tipo === 'POS' ? 'default' : 'secondary'} className="text-xs">
                              {tx.tipo}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(tx.fecha)}</span>
                          </div>
                          <span className="font-medium ml-2">{formatCopCentavos(tx.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { setDetailId(null); handleFormOpen(detail.id); }}>
                    <Pencil className="size-4 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://wa.me/${detail.telefono.replace(/\D/g, '')}`, '_blank')}
                  >
                    <MessageCircle className="size-4 mr-1" /> WhatsApp
                  </Button>
                  {detail.latitud && detail.longitud && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://www.google.com/maps?q=${detail.latitud},${detail.longitud}`, '_blank')}
                    >
                      <MapPin className="size-4 mr-1" /> Mapa
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDetailId(null); setDeleteId(detail.id); }}>
                    <Trash2 className="size-4 mr-1" /> Eliminar
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Eliminar cliente"
        description="Esta accion no se puede deshacer. Se eliminara el cliente y todo su historial."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </FadeIn>
  );
}
