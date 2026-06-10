'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Archive, PackagePlus, Pencil, Plus, RefreshCw, Search, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { formatCopCentavos, formatDate } from '@/lib/format';
import { usePurchases, useCreatePurchase, useCancelPurchase, useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/use-procurement';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth-store';
import { listProducts } from '@/services/inventory/inventory.service';
import type { Purchase, Supplier } from '@/types/api';

const purchaseStatusLabels: Record<string, string> = {
  ACTIVO: 'Activo',
  CANCELADO: 'Cancelado',
  RECIBIDO: 'Recibido',
};

const purchaseStatusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVO: 'default',
  CANCELADO: 'destructive',
  RECIBIDO: 'outline',
};

const supplierSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(120),
  telefono: z.string().optional(),
  email: z.string().optional(),
  direccion: z.string().optional(),
  observaciones: z.string().optional(),
});
type SupplierFormValues = z.infer<typeof supplierSchema>;

const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Selecciona un producto'),
  cantidad: z.number().int().gt(0, 'Debe ser > 0'),
  costoUnitario: z.number().gte(0, 'Debe ser >= 0'),
});

const purchaseSchema = z.object({
  supplierId: z.string().optional(),
  numeroFactura: z.string().optional(),
  fechaCompra: z.string().optional(),
  observaciones: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'Al menos un ítem'),
});
type PurchaseFormValues = z.infer<typeof purchaseSchema>;

export default function PurchasesClient() {
  const token = useAuthStore((s) => s.token);
  const [tab, setTab] = useState('purchases');
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: queryKeys.products.all(),
    queryFn: () => listProducts(token!),
    enabled: !!token,
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers(supplierSearch || undefined);
  const { data: purchases = [], isLoading: loadingPurchases } = usePurchases();
  const createPurchaseMut = useCreatePurchase();
  const cancelPurchaseMut = useCancelPurchase();
  const createSupplierMut = useCreateSupplier();
  const updateSupplierMut = useUpdateSupplier();
  const deleteSupplierMut = useDeleteSupplier();

  const supplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { nombre: '', telefono: '', email: '', direccion: '', observaciones: '' },
  });

  const purchaseForm = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierId: '',
      numeroFactura: '',
      fechaCompra: new Date().toISOString().slice(0, 10),
      observaciones: '',
      items: [{ productId: '', cantidad: 1, costoUnitario: 0 }],
    },
  });

  const purchaseTotal = useMemo(() => {
    const items = purchaseForm.watch('items') ?? [];
    return items.reduce((sum, item) => sum + (Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0), 0);
  }, [purchaseForm]);

  const totals = useMemo(() => purchases.reduce((acc, p) => {
    if (p.estado === 'CANCELADO') acc.cancelled += 1;
    else { acc.active += 1; acc.total += p.total; }
    return acc;
  }, { active: 0, cancelled: 0, total: 0 }), [purchases]);

  function openSupplierEdit(s: Supplier) {
    setEditingSupplier(s);
    supplierForm.reset({ nombre: s.nombre, telefono: s.telefono ?? '', email: s.email ?? '', direccion: s.direccion ?? '', observaciones: s.observaciones ?? '' });
  }

  function closeSupplierDialog() {
    setSupplierDialogOpen(false);
    setEditingSupplier(null);
    supplierForm.reset({ nombre: '', telefono: '', email: '', direccion: '', observaciones: '' });
  }

  function handleSupplierSubmit(data: SupplierFormValues) {
    const payload = { ...data, telefono: data.telefono || undefined, email: data.email || undefined, direccion: data.direccion || undefined, observaciones: data.observaciones || undefined };
    if (editingSupplier) {
      updateSupplierMut.mutate({ id: editingSupplier.id, input: payload }, {
        onSuccess: () => { toast.success('Proveedor actualizado'); closeSupplierDialog(); },
        onError: () => toast.error('Error al actualizar proveedor'),
      });
    } else {
      createSupplierMut.mutate(payload, {
        onSuccess: () => { toast.success('Proveedor creado'); closeSupplierDialog(); },
        onError: () => toast.error('Error al crear proveedor'),
      });
    }
  }

  function addItem() {
    const items = purchaseForm.getValues('items') ?? [];
    purchaseForm.setValue('items', [...items, { productId: '', cantidad: 1, costoUnitario: 0 }]);
  }

  function removeItem(index: number) {
    const items = purchaseForm.getValues('items') ?? [];
    if (items.length <= 1) purchaseForm.setValue('items', [{ productId: '', cantidad: 1, costoUnitario: 0 }]);
    else purchaseForm.setValue('items', items.filter((_, i) => i !== index));
  }

  function onProductSelect(index: number, productId: string) {
    purchaseForm.setValue(`items.${index}.productId`, productId);
    const product = products.find((p) => p.id === productId);
    if (product) purchaseForm.setValue(`items.${index}.costoUnitario`, product.costo);
  }

  function handlePurchaseSubmit(data: PurchaseFormValues) {
    createPurchaseMut.mutate({
      ...data,
      supplierId: data.supplierId || undefined,
      numeroFactura: data.numeroFactura || undefined,
      fechaCompra: data.fechaCompra || undefined,
      observaciones: data.observaciones || undefined,
      items: data.items.map((i) => ({ productId: i.productId, cantidad: i.cantidad, costoUnitario: i.costoUnitario })),
    }, {
      onSuccess: () => {
        toast.success('Compra registrada');
        purchaseForm.reset({ supplierId: '', numeroFactura: '', fechaCompra: new Date().toISOString().slice(0, 10), observaciones: '', items: [{ productId: '', cantidad: 1, costoUnitario: 0 }] });
        setPurchaseDialogOpen(false);
      },
      onError: () => toast.error('Error al registrar compra'),
    });
  }

  const purchaseColumns: ColumnDef<Purchase>[] = useMemo(() => [
    { accessorKey: 'fechaCompra', header: 'Fecha', cell: ({ row }) => formatDate(row.original.fechaCompra) },
    { accessorKey: 'numeroFactura', header: 'Factura', cell: ({ row }) => row.original.numeroFactura ?? '—' },
    { accessorKey: 'supplier', header: 'Proveedor', cell: ({ row }) => row.original.supplier?.nombre ?? '—' },
    { accessorKey: 'total', header: 'Total', cell: ({ row }) => formatCopCentavos(row.original.total) },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <Badge variant={purchaseStatusColors[row.original.estado] ?? 'outline'}>{purchaseStatusLabels[row.original.estado] ?? row.original.estado}</Badge>,
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => row.original.estado !== 'CANCELADO' ? (
        <Button size="icon-xs" variant="ghost" onClick={() => setCancelTarget(row.original)} title="Anular"><Archive className="size-3" /></Button>
      ) : null,
    },
  ], []);

  const supplierColumns: ColumnDef<Supplier>[] = useMemo(() => [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'telefono', header: 'Teléfono', cell: ({ row }) => row.original.telefono ?? '—' },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email ?? '—' },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon-xs" variant="ghost" onClick={() => openSupplierEdit(row.original)} title="Editar"><Pencil className="size-3" /></Button>
          <Button size="icon-xs" variant="ghost" onClick={() => setDeleteSupplierTarget(row.original)} title="Eliminar"><Trash2 className="size-3" /></Button>
        </div>
      ),
    },
  ], []);

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Compras y proveedores" description="Entradas de inventario con proveedor, factura y costos.">
        <Button variant="outline" size="icon" onClick={() => window.location.reload()} title="Actualizar"><RefreshCw className="size-4" /></Button>
      </PageHeader>

      <StaggerList><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Compras activas</p><p className="text-2xl font-bold">{totals.active}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total compras</p><p className="text-2xl font-bold">{formatCopCentavos(totals.total)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Anuladas</p><p className="text-2xl font-bold">{totals.cancelled}</p></CardContent></Card>
      </div></StaggerList>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setPurchaseDialogOpen(true)}><PackagePlus className="size-4 mr-1" /> Nueva compra</Button>
          </div>
          {loadingPurchases ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <DataTable columns={purchaseColumns} data={purchases} />
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar proveedor..." value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} />
            </div>
            <Button onClick={() => { setEditingSupplier(null); supplierForm.reset({ nombre: '', telefono: '', email: '', direccion: '', observaciones: '' }); setSupplierDialogOpen(true); }}>
              <Plus className="size-4 mr-1" /> Nuevo proveedor
            </Button>
          </div>
          {loadingSuppliers ? (
            <div className="space-y-2"><Skeleton className="h-12 w-full" /></div>
          ) : (
            <DataTable columns={supplierColumns} data={suppliers} />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar compra</DialogTitle>
          </DialogHeader>
          <form onSubmit={purchaseForm.handleSubmit(handlePurchaseSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Proveedor</Label>
                <Select value={purchaseForm.watch('supplierId') ?? ''} onValueChange={(v) => purchaseForm.setValue('supplierId', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Sin proveedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin proveedor</SelectItem>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Factura</Label>
                <Input {...purchaseForm.register('numeroFactura')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" {...purchaseForm.register('fechaCompra')} />
              </div>
              <div className="space-y-1">
                <Label>Observaciones</Label>
                <Input {...purchaseForm.register('observaciones')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ítems</Label>
              {purchaseForm.watch('items')?.map((_, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Select value={purchaseForm.watch(`items.${index}.productId`) ?? ''} onValueChange={(v) => { if (v) onProductSelect(index, v); }}>
                      <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                      <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label>Cant.</Label>
                    <Input type="number" min={1} {...purchaseForm.register(`items.${index}.cantidad`, { valueAsNumber: true })} />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label>Costo u.</Label>
                    <Input type="number" min={0} step={100} {...purchaseForm.register(`items.${index}.costoUnitario`, { valueAsNumber: true })} />
                  </div>
                  <Button size="icon" variant="ghost" type="button" onClick={() => removeItem(index)}><Trash2 className="size-4" /></Button>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" type="button" onClick={addItem}><Plus className="size-4 mr-1" /> Agregar ítem</Button>
                <p className="text-lg font-bold">{formatCopCentavos(purchaseTotal)}</p>
              </div>
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={createPurchaseMut.isPending}>
                <PackagePlus className="size-4 mr-1" /> Registrar compra
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={supplierDialogOpen} onOpenChange={(open: boolean) => { if (!open) closeSupplierDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={supplierForm.handleSubmit(handleSupplierSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input {...supplierForm.register('nombre')} />
              {supplierForm.formState.errors.nombre && <p className="text-xs text-destructive">{supplierForm.formState.errors.nombre.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Teléfono</Label><Input {...supplierForm.register('telefono')} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" {...supplierForm.register('email')} /></div>
            </div>
            <div className="space-y-1"><Label>Dirección</Label><Input {...supplierForm.register('direccion')} /></div>
            <div className="space-y-1"><Label>Observaciones</Label><Textarea {...supplierForm.register('observaciones')} /></div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={createSupplierMut.isPending || updateSupplierMut.isPending}>
                {editingSupplier ? 'Guardar cambios' : 'Crear proveedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open: boolean) => { if (!open) setCancelTarget(null); }}
        title="Anular compra"
        description={`¿Anular compra ${cancelTarget?.numeroFactura ?? cancelTarget?.id}? Se reversará el stock.`}
        variant="destructive"
        confirmLabel="Anular compra"
        onConfirm={() => {
          if (cancelTarget) cancelPurchaseMut.mutate(cancelTarget.id, {
            onSuccess: () => { toast.success('Compra anulada'); setCancelTarget(null); },
            onError: () => toast.error('Error al anular compra'),
          });
        }}
      />

      <ConfirmDialog
        open={!!deleteSupplierTarget}
        onOpenChange={(open: boolean) => { if (!open) setDeleteSupplierTarget(null); }}
        title="Eliminar proveedor"
        description={`¿Eliminar proveedor "${deleteSupplierTarget?.nombre}"?`}
        variant="destructive"
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteSupplierTarget) deleteSupplierMut.mutate(deleteSupplierTarget.id, {
            onSuccess: () => { toast.success('Proveedor eliminado'); setDeleteSupplierTarget(null); },
            onError: () => toast.error('Error al eliminar proveedor'),
          });
        }}
      />
    </FadeIn>
  );
}