'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { BarChart3, BookOpen, DollarSign, Pencil, Plus, RefreshCw, Search, SlidersHorizontal, Ticket, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import {
  usePromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  useCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
} from '@/hooks/use-promotions';
import type { Promotion, Coupon } from '@/services/promotions/promotions.service';

const tipoLabels: Record<string, string> = {
  PORCENTAJE: 'Porcentaje',
  MONTO_FIJO: 'Monto fijo',
  PRECIO_FIJO: 'Precio fijo',
  N_X_M: 'N x M',
  COMBO: 'Combo',
  ENVIO_GRATIS: 'Envío gratis',
};

const alcanceLabels: Record<string, string> = {
  GLOBAL: 'Global',
  CATEGORIA: 'Categoría',
  PRODUCTO: 'Producto',
  CLIENTE_SEGMENTO: 'Segmento cliente',
};

const promotionSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  tipo: z.enum(['PORCENTAJE', 'MONTO_FIJO', 'PRECIO_FIJO', 'N_X_M', 'COMBO', 'ENVIO_GRATIS']),
  alcance: z.enum(['GLOBAL', 'CATEGORIA', 'PRODUCTO', 'CLIENTE_SEGMENTO']),
  valor: z.coerce.number().int().min(0),
  valorMaximo: z.coerce.number().int().optional(),
  minCompra: z.coerce.number().int().optional(),
  minItems: z.coerce.number().int().optional(),
  cantidadGratis: z.coerce.number().int().optional(),
  fechaInicio: z.string().min(1, 'Requerida'),
  fechaFin: z.string().min(1, 'Requerida'),
  diasSemana: z.string().optional(),
  horarioInicio: z.string().optional(),
  horarioFin: z.string().optional(),
  segmento: z.string().optional(),
  maxUsos: z.coerce.number().int().optional(),
  maxUsosCliente: z.coerce.number().int().optional(),
  active: z.boolean(),
});
type PromotionFormValues = z.infer<typeof promotionSchema>;

const couponSchema = z.object({
  codigo: z.string().min(1, 'Requerido'),
  tipo: z.enum(['PORCENTAJE', 'MONTO_FIJO']),
  valor: z.coerce.number().int().min(0),
  valorMaximo: z.coerce.number().int().optional(),
  minCompra: z.coerce.number().int().optional(),
  usosMaximos: z.coerce.number().int().optional(),
  maxUsosCliente: z.coerce.number().int().optional(),
  fechaExpiracion: z.string().optional(),
});
type CouponFormValues = z.infer<typeof couponSchema>;

export default function PromotionsClient() {
  const { token } = useAuth();
  const [tab, setTab] = useState('promotions');
  const [promoSearch, setPromoSearch] = useState('');
  const [couponSearch, setCouponSearch] = useState('');

  const { data: promotions = [], isLoading: loadingPromotions, refetch: refetchPromotions } = usePromotions(token!);
  const { data: coupons = [], isLoading: loadingCoupons, refetch: refetchCoupons } = useCoupons(token!);

  const createPromotionMutation = useCreatePromotion(token!);
  const updatePromotionMutation = useUpdatePromotion(token!);
  const deletePromotionMutation = useDeletePromotion(token!);
  const createCouponMutation = useCreateCoupon(token!);
  const updateCouponMutation = useUpdateCoupon(token!);
  const deleteCouponMutation = useDeleteCoupon(token!);

  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [deletePromoId, setDeletePromoId] = useState<string | null>(null);

  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteCouponId, setDeleteCouponId] = useState<string | null>(null);

  const promoForm = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema) as never,
    defaultValues: { nombre: '', descripcion: '', tipo: 'PORCENTAJE', alcance: 'GLOBAL', valor: 0, fechaInicio: '', fechaFin: '', active: true },
    values: editingPromo ? {
      nombre: editingPromo.nombre,
      descripcion: editingPromo.descripcion ?? '',
      tipo: editingPromo.tipo,
      alcance: editingPromo.alcance,
      valor: editingPromo.valor,
      valorMaximo: editingPromo.valorMaximo ?? undefined,
      minCompra: editingPromo.minCompra ?? undefined,
      minItems: editingPromo.minItems ?? undefined,
      cantidadGratis: editingPromo.cantidadGratis ?? undefined,
      fechaInicio: editingPromo.fechaInicio.slice(0, 16),
      fechaFin: editingPromo.fechaFin.slice(0, 16),
      diasSemana: editingPromo.diasSemana?.join(',') ?? '',
      horarioInicio: editingPromo.horarioInicio ?? '',
      horarioFin: editingPromo.horarioFin ?? '',
      segmento: editingPromo.segmento ?? '',
      maxUsos: editingPromo.maxUsos ?? undefined,
      maxUsosCliente: editingPromo.maxUsosCliente ?? undefined,
      active: editingPromo.active,
    } : undefined,
  });

  const couponForm = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema) as never,
    defaultValues: { codigo: '', tipo: 'PORCENTAJE', valor: 0 },
    values: editingCoupon ? {
      codigo: editingCoupon.codigo,
      tipo: editingCoupon.tipo,
      valor: editingCoupon.valor,
      valorMaximo: editingCoupon.valorMaximo ?? undefined,
      minCompra: editingCoupon.minCompra ?? undefined,
      usosMaximos: editingCoupon.usosMaximos ?? undefined,
      maxUsosCliente: editingCoupon.maxUsosCliente ?? undefined,
      fechaExpiracion: editingCoupon.fechaExpiracion?.slice(0, 16) ?? '',
    } : undefined,
  });

  const filteredPromotions = useMemo(() => {
    const q = promoSearch.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((promo) =>
      [promo.nombre, promo.descripcion, tipoLabels[promo.tipo], alcanceLabels[promo.alcance]]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q)),
    );
  }, [promoSearch, promotions]);

  const filteredCoupons = useMemo(() => {
    const q = couponSearch.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter((coupon) =>
      [coupon.codigo, coupon.promotion?.nombre, coupon.tipo]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q)),
    );
  }, [couponSearch, coupons]);

  const stats = useMemo(() => {
    const activePromotions = promotions.filter((promo) => promo.active).length;
    const activeCoupons = coupons.filter((coupon) => coupon.active).length;
    const redemptions =
      promotions.reduce((sum, promo) => sum + promo.usosActuales, 0) +
      coupons.reduce((sum, coupon) => sum + coupon.usosActuales, 0);

    return [
      { title: 'Promociones activas', value: activePromotions, icon: Tag, description: activePromotions ? 'Campanas disponibles' : 'No hay promociones activas' },
      { title: 'Cupones activos', value: activeCoupons, icon: Ticket, description: activeCoupons ? 'Codigos disponibles' : 'No hay cupones activos' },
      { title: 'Redenciones del mes', value: redemptions, icon: BarChart3, description: '0% vs mes anterior' },
      { title: 'Ventas generadas', value: '$ 0', icon: DollarSign, description: '0% vs mes anterior' },
    ];
  }, [coupons, promotions]);

  function openPromoCreate() {
    setEditingPromo(null);
    promoForm.reset({ nombre: '', descripcion: '', tipo: 'PORCENTAJE', alcance: 'GLOBAL', valor: 0, fechaInicio: '', fechaFin: '', active: true });
    setPromoDialogOpen(true);
  }

  function openPromoEdit(promo: Promotion) {
    setEditingPromo(promo);
    setPromoDialogOpen(true);
  }

  async function handlePromoSubmit(values: PromotionFormValues) {
    const data: Record<string, unknown> = {
      ...values,
      diasSemana: values.diasSemana ? values.diasSemana.split(',').map(Number).filter((n) => !isNaN(n)) : undefined,
    };
    if (!data.diasSemana || (data.diasSemana as number[]).length === 0) delete data.diasSemana;
    if (editingPromo) {
      await updatePromotionMutation.mutateAsync({ id: editingPromo.id, data });
    } else {
      await createPromotionMutation.mutateAsync(data);
    }
    setPromoDialogOpen(false);
  }

  function openCouponCreate() {
    setEditingCoupon(null);
    couponForm.reset({ codigo: '', tipo: 'PORCENTAJE', valor: 0 });
    setCouponDialogOpen(true);
  }

  function openCouponEdit(coupon: Coupon) {
    setEditingCoupon(coupon);
    setCouponDialogOpen(true);
  }

  async function handleCouponSubmit(values: CouponFormValues) {
    const data: Record<string, unknown> = { ...values };
    if (editingCoupon) {
      await updateCouponMutation.mutateAsync({ id: editingCoupon.id, data });
    } else {
      await createCouponMutation.mutateAsync(data);
    }
    setCouponDialogOpen(false);
  }

  const promoColumns: ColumnDef<Promotion>[] = useMemo(() => [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => tipoLabels[row.original.tipo] ?? row.original.tipo,
    },
    {
      accessorKey: 'alcance',
      header: 'Alcance',
      cell: ({ row }) => alcanceLabels[row.original.alcance] ?? row.original.alcance,
    },
    {
      accessorKey: 'valor',
      header: 'Valor',
      cell: ({ row }) => row.original.tipo === 'PORCENTAJE' ? `${row.original.valor}%` : `$${row.original.valor.toLocaleString()}`,
    },
    {
      header: 'Vigencia',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.original.fechaInicio)} - {formatDate(row.original.fechaFin)}
        </span>
      ),
    },
    {
      accessorKey: 'usosActuales',
      header: 'Usos',
      cell: ({ row }) => `${row.original.usosActuales}${row.original.maxUsos ? `/${row.original.maxUsos}` : ''}`,
    },
    {
      accessorKey: 'active',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.active ? 'default' : 'secondary'}>
          {row.original.active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => openPromoEdit(row.original)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeletePromoId(row.original.id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  const couponColumns: ColumnDef<Coupon>[] = useMemo(() => [
    { accessorKey: 'codigo', header: 'Código' },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => (row.original.tipo === 'PORCENTAJE' ? 'Porcentaje' : 'Monto fijo'),
    },
    {
      accessorKey: 'valor',
      header: 'Valor',
      cell: ({ row }) => row.original.tipo === 'PORCENTAJE' ? `${row.original.valor}%` : `$${row.original.valor.toLocaleString()}`,
    },
    {
      header: 'Usos',
      cell: ({ row }) => `${row.original.usosActuales}${row.original.usosMaximos ? `/${row.original.usosMaximos}` : ''}`,
    },
    {
      accessorKey: 'fechaExpiracion',
      header: 'Expira',
      cell: ({ row }) => row.original.fechaExpiracion ? formatDate(row.original.fechaExpiracion) : '-',
    },
    {
      accessorKey: 'active',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.active ? 'default' : 'secondary'}>
          {row.original.active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => openCouponEdit(row.original)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteCouponId(row.original.id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Promociones y Cupones" description="Administra promociones y cupones de descuento">
        <Button onClick={openPromoCreate}>
          <Plus className="mr-1 size-4" />
          Crear promocion
        </Button>
      </PageHeader>

      <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </StaggerList>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList>
            <TabsTrigger value="promotions" className="gap-2">
              <Tag className="size-4" />
              Promociones
            </TabsTrigger>
            <TabsTrigger value="coupons" className="gap-2">
              <Ticket className="size-4" />
              Cupones
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={tab === 'promotions' ? promoSearch : couponSearch}
                onChange={(event) => (tab === 'promotions' ? setPromoSearch(event.target.value) : setCouponSearch(event.target.value))}
                placeholder={tab === 'promotions' ? 'Buscar promociones...' : 'Buscar cupones...'}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <SlidersHorizontal className="mr-1 size-4" />
              Filtros
            </Button>
            <Button variant="outline" size="icon" onClick={() => { refetchPromotions(); refetchCoupons(); }} title="Actualizar">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="promotions" className="space-y-4">
          <div className="hidden">
            <Button onClick={openPromoCreate}>
              <Plus className="mr-1 size-4" />
              Crear promoción
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loadingPromotions ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Cargando...</div>
              ) : (
                <DataTable
                  columns={promoColumns}
                  data={filteredPromotions}
                  emptyState={(
                    <EmptyState
                      icon={<Tag className="size-9" />}
                      title="Aun no tienes promociones"
                      description="Crea tu primera promocion y comienza a impulsar tus ventas con descuentos y ofertas especiales."
                      action={(
                        <div className="flex flex-col items-center gap-3">
                          <Button onClick={openPromoCreate}>
                            <Plus className="mr-1 size-4" />
                            Crear promocion
                          </Button>
                          <Button variant="link" className="gap-1">
                            <BookOpen className="size-4" />
                            Ver guia rapida
                          </Button>
                        </div>
                      )}
                    />
                  )}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCouponCreate}>
              <Plus className="mr-1 size-4" />
              Crear cupón
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loadingCoupons ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Cargando...</div>
              ) : (
                <DataTable
                  columns={couponColumns}
                  data={filteredCoupons}
                  emptyState={(
                    <EmptyState
                      icon={<Ticket className="size-9" />}
                      title="Aun no tienes cupones"
                      description="Crea codigos de descuento para campanas, clientes frecuentes o acciones comerciales puntuales."
                      action={<Button onClick={openCouponCreate}><Plus className="mr-1 size-4" />Crear cupon</Button>}
                    />
                  )}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPromo ? 'Editar promoción' : 'Crear promoción'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={promoForm.handleSubmit(handlePromoSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Nombre</Label>
                <Input {...promoForm.register('nombre')} />
                {promoForm.formState.errors.nombre && <p className="text-xs text-destructive">{promoForm.formState.errors.nombre.message}</p>}
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Descripción</Label>
                <Textarea {...promoForm.register('descripcion')} />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={promoForm.watch('tipo')} onValueChange={(v) => promoForm.setValue('tipo', v as PromotionFormValues['tipo'])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Alcance</Label>
                <Select value={promoForm.watch('alcance')} onValueChange={(v) => promoForm.setValue('alcance', v as PromotionFormValues['alcance'])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(alcanceLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor</Label>
                <Input type="number" {...promoForm.register('valor')} />
              </div>
              <div className="space-y-1">
                <Label>Valor máximo</Label>
                <Input type="number" {...promoForm.register('valorMaximo')} />
              </div>
              <div className="space-y-1">
                <Label>Compra mínima</Label>
                <Input type="number" {...promoForm.register('minCompra')} />
              </div>
              <div className="space-y-1">
                <Label>Items mínimos</Label>
                <Input type="number" {...promoForm.register('minItems')} />
              </div>
              <div className="space-y-1">
                <Label>Cantidad gratis</Label>
                <Input type="number" {...promoForm.register('cantidadGratis')} />
              </div>
              <div className="space-y-1">
                <Label>Segmento</Label>
                <Input {...promoForm.register('segmento')} />
              </div>
              <div className="space-y-1">
                <Label>Inicio</Label>
                <Input type="datetime-local" {...promoForm.register('fechaInicio')} />
              </div>
              <div className="space-y-1">
                <Label>Fin</Label>
                <Input type="datetime-local" {...promoForm.register('fechaFin')} />
              </div>
              <div className="space-y-1">
                <Label>Días semana (0-6, coma)</Label>
                <Input {...promoForm.register('diasSemana')} placeholder="1,3,5" />
              </div>
              <div className="space-y-1">
                <Label>Inicio horario</Label>
                <Input type="time" {...promoForm.register('horarioInicio')} />
              </div>
              <div className="space-y-1">
                <Label>Fin horario</Label>
                <Input type="time" {...promoForm.register('horarioFin')} />
              </div>
              <div className="space-y-1">
                <Label>Max usos</Label>
                <Input type="number" {...promoForm.register('maxUsos')} />
              </div>
              <div className="space-y-1">
                <Label>Max usos/cliente</Label>
                <Input type="number" {...promoForm.register('maxUsosCliente')} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch
                  checked={promoForm.watch('active')}
                  onCheckedChange={(v) => promoForm.setValue('active', v)}
                />
                <Label>Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPromoDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createPromotionMutation.isPending || updatePromotionMutation.isPending}>
                {editingPromo ? 'Guardar cambios' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Editar cupón' : 'Crear cupón'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={couponForm.handleSubmit(handleCouponSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Código</Label>
                <Input {...couponForm.register('codigo')} disabled={!!editingCoupon} />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={couponForm.watch('tipo')} onValueChange={(v) => couponForm.setValue('tipo', v as CouponFormValues['tipo'])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PORCENTAJE">Porcentaje</SelectItem>
                    <SelectItem value="MONTO_FIJO">Monto fijo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor</Label>
                <Input type="number" {...couponForm.register('valor')} />
              </div>
              <div className="space-y-1">
                <Label>Valor máximo</Label>
                <Input type="number" {...couponForm.register('valorMaximo')} />
              </div>
              <div className="space-y-1">
                <Label>Compra mínima</Label>
                <Input type="number" {...couponForm.register('minCompra')} />
              </div>
              <div className="space-y-1">
                <Label>Usos máximos</Label>
                <Input type="number" {...couponForm.register('usosMaximos')} />
              </div>
              <div className="space-y-1">
                <Label>Max usos/cliente</Label>
                <Input type="number" {...couponForm.register('maxUsosCliente')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Fecha expiración</Label>
                <Input type="datetime-local" {...couponForm.register('fechaExpiracion')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCouponDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createCouponMutation.isPending || updateCouponMutation.isPending}>
                {editingCoupon ? 'Guardar cambios' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletePromoId}
        onOpenChange={(o) => { if (!o) setDeletePromoId(null); }}
        title="Eliminar promoción"
        description="¿Estás seguro de eliminar esta promoción? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deletePromoId) {
            await deletePromotionMutation.mutateAsync(deletePromoId);
            setDeletePromoId(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteCouponId}
        onOpenChange={(o) => { if (!o) setDeleteCouponId(null); }}
        title="Eliminar cupón"
        description="¿Estás seguro de eliminar este cupón? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deleteCouponId) {
            await deleteCouponMutation.mutateAsync(deleteCouponId);
            setDeleteCouponId(null);
          }
        }}
      />
    </FadeIn>
  );
}
