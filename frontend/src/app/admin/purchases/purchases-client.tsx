'use client';

import { useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Archive,
  Bot,
  CalendarClock,
  Camera,
  DollarSign,
  FileText,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  UploadCloud,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { formatCopCentavos, formatDate } from '@/lib/format';
import {
  useCancelPurchase,
  useCreatePurchase,
  useCreateSupplier,
  useDeleteSupplier,
  useExtractPurchaseInvoice,
  usePurchases,
  useSuppliers,
  useUpdatePurchaseInvoice,
  useUpdateSupplier,
} from '@/hooks/use-procurement';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth-store';
import { listProducts } from '@/services/inventory/inventory.service';
import { csrfHeaders } from '@/services/api/client';
import type { ApiEnvelope, Purchase, PurchasePaymentStatus, Supplier } from '@/types/api';
import type { PurchaseFilters } from '@/services/procurement/procurement.service';

const NO_SUPPLIER_VALUE = 'none';

const paymentStatusLabels: Record<PurchasePaymentStatus, string> = {
  PENDIENTE: 'Pendiente',
  PAGADA: 'Pagada',
  VENCIDA: 'Vencida',
  PARCIAL: 'Parcial',
};

const paymentStatusColors: Record<PurchasePaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDIENTE: 'secondary',
  PAGADA: 'default',
  VENCIDA: 'destructive',
  PARCIAL: 'outline',
};

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

interface UploadResponse {
  key: string;
  url: string;
  size: number;
  mimetype: string;
  originalName?: string;
}

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

const invoiceFields = {
  fechaVencimiento: z.string().optional(),
  estadoPago: z.enum(['PENDIENTE', 'PAGADA', 'VENCIDA', 'PARCIAL']).optional(),
  facturaUrl: z.string().optional(),
  facturaKey: z.string().optional(),
  facturaNombre: z.string().optional(),
  facturaMime: z.string().optional(),
  facturaOcrTexto: z.string().optional(),
  facturaOcrJson: z.any().optional(),
};

const purchaseSchema = z.object({
  supplierId: z.string().optional(),
  numeroFactura: z.string().optional(),
  fechaCompra: z.string().optional(),
  observaciones: z.string().optional(),
  ...invoiceFields,
  items: z.array(purchaseItemSchema).min(1, 'Al menos un item'),
});
type PurchaseFormValues = z.infer<typeof purchaseSchema>;

const invoiceSchema = z.object(invoiceFields);
type InvoiceFormValues = z.infer<typeof invoiceSchema>;

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function dateInput(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function isOverdue(purchase: Purchase) {
  if (!purchase.fechaVencimiento || purchase.estadoPago === 'PAGADA' || purchase.estado === 'CANCELADO') return false;
  return new Date(purchase.fechaVencimiento).getTime() < new Date(todayInput()).getTime();
}

function isDueSoon(purchase: Purchase) {
  if (!purchase.fechaVencimiento || purchase.estadoPago === 'PAGADA' || purchase.estado === 'CANCELADO') return false;
  const due = new Date(purchase.fechaVencimiento).getTime();
  const now = new Date(todayInput()).getTime();
  const sevenDays = now + 7 * 86_400_000;
  return due >= now && due <= sevenDays;
}

function invoiceFileLabel(purchase: Purchase) {
  return purchase.facturaNombre || purchase.facturaUrl?.split('/').pop() || 'Ver factura';
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No fue posible leer el archivo'));
    reader.readAsDataURL(file);
  });
}

async function uploadInvoiceFile(file: File, token: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'invoices');

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/uploads/upload`,
    {
      method: 'POST',
      headers: csrfHeaders(),
      credentials: 'include',
      body: formData,
    },
  );

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<UploadResponse> | UploadResponse | { message?: string };
  if (!response.ok) {
    throw new Error('message' in payload && payload.message ? String(payload.message) : 'Error al subir factura');
  }
  return 'data' in payload ? payload.data : (payload as UploadResponse);
}

export default function PurchasesClient() {
  const token = useAuthStore((s) => s.token);
  const purchaseFileInputRef = useRef<HTMLInputElement>(null);
  const purchaseCameraInputRef = useRef<HTMLInputElement>(null);
  const editInvoiceFileInputRef = useRef<HTMLInputElement>(null);
  const editInvoiceCameraInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState('purchases');
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<Purchase | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [purchaseFilters, setPurchaseFilters] = useState<PurchaseFilters>({ estadoPago: 'all', due: 'all' });
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: queryKeys.products.all(),
    queryFn: () => listProducts(token!),
    enabled: !!token,
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers(supplierSearch || undefined);
  const { data: purchases = [], isLoading: loadingPurchases, refetch: refetchPurchases } = usePurchases(purchaseFilters);
  const createPurchaseMut = useCreatePurchase();
  const cancelPurchaseMut = useCancelPurchase();
  const createSupplierMut = useCreateSupplier();
  const updateSupplierMut = useUpdateSupplier();
  const deleteSupplierMut = useDeleteSupplier();
  const updateInvoiceMut = useUpdatePurchaseInvoice();
  const extractInvoiceMut = useExtractPurchaseInvoice();

  const supplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { nombre: '', telefono: '', email: '', direccion: '', observaciones: '' },
  });

  const purchaseForm = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierId: '',
      numeroFactura: '',
      fechaCompra: todayInput(),
      fechaVencimiento: '',
      estadoPago: 'PENDIENTE',
      observaciones: '',
      facturaUrl: '',
      facturaKey: '',
      facturaNombre: '',
      facturaMime: '',
      facturaOcrTexto: '',
      facturaOcrJson: undefined,
      items: [{ productId: '', cantidad: 1, costoUnitario: 0 }],
    },
  });

  const invoiceForm = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      fechaVencimiento: '',
      estadoPago: 'PENDIENTE',
      facturaUrl: '',
      facturaKey: '',
      facturaNombre: '',
      facturaMime: '',
      facturaOcrTexto: '',
      facturaOcrJson: undefined,
    },
  });

  const purchaseItems = useWatch({ control: purchaseForm.control, name: 'items' }) ?? [];
  const purchaseSupplierId = useWatch({ control: purchaseForm.control, name: 'supplierId' });
  const purchasePaymentStatus = useWatch({ control: purchaseForm.control, name: 'estadoPago' });
  const purchaseInvoiceName = useWatch({ control: purchaseForm.control, name: 'facturaNombre' });
  const purchaseInvoiceUrl = useWatch({ control: purchaseForm.control, name: 'facturaUrl' });
  const purchaseInvoiceOcrText = useWatch({ control: purchaseForm.control, name: 'facturaOcrTexto' });
  const invoicePaymentStatus = useWatch({ control: invoiceForm.control, name: 'estadoPago' });
  const invoiceName = useWatch({ control: invoiceForm.control, name: 'facturaNombre' });
  const invoiceUrl = useWatch({ control: invoiceForm.control, name: 'facturaUrl' });
  const invoiceOcrText = useWatch({ control: invoiceForm.control, name: 'facturaOcrTexto' });
  const purchaseTotal = purchaseItems.reduce((sum, item) => sum + (Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0), 0);

  const totals = useMemo(() => purchases.reduce((acc, purchase) => {
    if (purchase.estado === 'CANCELADO') {
      acc.cancelled += 1;
      return acc;
    }
    acc.active += 1;
    acc.total += purchase.total;
    if (purchase.estadoPago !== 'PAGADA') acc.payable += purchase.total;
    if (isOverdue(purchase)) acc.overdue += 1;
    if (isDueSoon(purchase)) acc.dueSoon += 1;
    return acc;
  }, { active: 0, cancelled: 0, total: 0, payable: 0, overdue: 0, dueSoon: 0 }), [purchases]);

  function resetPurchaseForm() {
    purchaseForm.reset({
      supplierId: '',
      numeroFactura: '',
      fechaCompra: todayInput(),
      fechaVencimiento: '',
      estadoPago: 'PENDIENTE',
      observaciones: '',
      facturaUrl: '',
      facturaKey: '',
      facturaNombre: '',
      facturaMime: '',
      facturaOcrTexto: '',
      facturaOcrJson: undefined,
      items: [{ productId: '', cantidad: 1, costoUnitario: 0 }],
    });
  }

  function openSupplierEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    supplierForm.reset({
      nombre: supplier.nombre,
      telefono: supplier.telefono ?? '',
      email: supplier.email ?? '',
      direccion: supplier.direccion ?? '',
      observaciones: supplier.observaciones ?? '',
    });
    setSupplierDialogOpen(true);
  }

  function closeSupplierDialog() {
    setSupplierDialogOpen(false);
    setEditingSupplier(null);
    supplierForm.reset({ nombre: '', telefono: '', email: '', direccion: '', observaciones: '' });
  }

  function openInvoiceEdit(purchase: Purchase) {
    setInvoiceTarget(purchase);
    invoiceForm.reset({
      fechaVencimiento: dateInput(purchase.fechaVencimiento),
      estadoPago: purchase.estadoPago ?? 'PENDIENTE',
      facturaUrl: purchase.facturaUrl ?? '',
      facturaKey: purchase.facturaKey ?? '',
      facturaNombre: purchase.facturaNombre ?? '',
      facturaMime: purchase.facturaMime ?? '',
      facturaOcrTexto: purchase.facturaOcrTexto ?? '',
      facturaOcrJson: purchase.facturaOcrJson ?? undefined,
    });
    setInvoiceDialogOpen(true);
  }

  function handleSupplierSubmit(data: SupplierFormValues) {
    const payload = {
      ...data,
      telefono: data.telefono || undefined,
      email: data.email || undefined,
      direccion: data.direccion || undefined,
      observaciones: data.observaciones || undefined,
    };
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
    purchaseForm.setValue('items', [...purchaseItems, { productId: '', cantidad: 1, costoUnitario: 0 }]);
  }

  function removeItem(index: number) {
    if (purchaseItems.length <= 1) purchaseForm.setValue('items', [{ productId: '', cantidad: 1, costoUnitario: 0 }]);
    else purchaseForm.setValue('items', purchaseItems.filter((_, i) => i !== index));
  }

  function onProductSelect(index: number, productId: string) {
    purchaseForm.setValue(`items.${index}.productId`, productId);
    const product = products.find((p) => p.id === productId);
    if (product) purchaseForm.setValue(`items.${index}.costoUnitario`, product.costo);
  }

  async function applyInvoiceFile(file: File, target: 'create' | 'edit') {
    if (!token) {
      toast.error('No autenticado');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('La factura supera 15MB');
      return;
    }

    setUploadingInvoice(true);
    try {
      const uploaded = await uploadInvoiceFile(file, token);
      if (target === 'create') {
        purchaseForm.setValue('facturaUrl', uploaded.url);
        purchaseForm.setValue('facturaKey', uploaded.key);
        purchaseForm.setValue('facturaNombre', uploaded.originalName || file.name);
        purchaseForm.setValue('facturaMime', uploaded.mimetype || file.type);
      } else {
        invoiceForm.setValue('facturaUrl', uploaded.url);
        invoiceForm.setValue('facturaKey', uploaded.key);
        invoiceForm.setValue('facturaNombre', uploaded.originalName || file.name);
        invoiceForm.setValue('facturaMime', uploaded.mimetype || file.type);
      }
      toast.success('Factura adjuntada');

      if (file.type.startsWith('image/')) {
        const fileBase64 = await readFileAsDataUrl(file);
        const extraction = await extractInvoiceMut.mutateAsync({
          fileBase64,
          mimeType: file.type,
          fileName: file.name,
        });
        const extracted = extraction.extracted;
        if (target === 'create') {
          purchaseForm.setValue('facturaOcrTexto', extraction.rawText);
          purchaseForm.setValue('facturaOcrJson', extracted);
          if (extracted.numeroFactura) purchaseForm.setValue('numeroFactura', extracted.numeroFactura);
          if (extracted.fechaCompra) purchaseForm.setValue('fechaCompra', extracted.fechaCompra.slice(0, 10));
          if (extracted.fechaVencimiento) purchaseForm.setValue('fechaVencimiento', extracted.fechaVencimiento.slice(0, 10));
        } else {
          invoiceForm.setValue('facturaOcrTexto', extraction.rawText);
          invoiceForm.setValue('facturaOcrJson', extracted);
          if (extracted.fechaVencimiento) invoiceForm.setValue('fechaVencimiento', extracted.fechaVencimiento.slice(0, 10));
        }
        toast.success('Datos extraidos con IA');
      } else {
        toast.info('PDF adjuntado. La extraccion IA del MVP funciona con imagenes.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible procesar la factura');
    } finally {
      setUploadingInvoice(false);
      if (target === 'create' && purchaseFileInputRef.current) purchaseFileInputRef.current.value = '';
      if (target === 'create' && purchaseCameraInputRef.current) purchaseCameraInputRef.current.value = '';
      if (target === 'edit' && editInvoiceFileInputRef.current) editInvoiceFileInputRef.current.value = '';
      if (target === 'edit' && editInvoiceCameraInputRef.current) editInvoiceCameraInputRef.current.value = '';
    }
  }

  function handlePurchaseSubmit(data: PurchaseFormValues) {
    createPurchaseMut.mutate({
      ...data,
      supplierId: data.supplierId || undefined,
      numeroFactura: data.numeroFactura || undefined,
      fechaCompra: data.fechaCompra || undefined,
      fechaVencimiento: data.fechaVencimiento || undefined,
      estadoPago: data.estadoPago || 'PENDIENTE',
      facturaUrl: data.facturaUrl || undefined,
      facturaKey: data.facturaKey || undefined,
      facturaNombre: data.facturaNombre || undefined,
      facturaMime: data.facturaMime || undefined,
      facturaOcrTexto: data.facturaOcrTexto || undefined,
      facturaOcrJson: data.facturaOcrJson,
      observaciones: data.observaciones || undefined,
      items: data.items.map((item) => ({
        productId: item.productId,
        cantidad: item.cantidad,
        costoUnitario: item.costoUnitario,
      })),
    }, {
      onSuccess: () => {
        toast.success('Compra registrada');
        resetPurchaseForm();
        setPurchaseDialogOpen(false);
      },
      onError: () => toast.error('Error al registrar compra'),
    });
  }

  function handleInvoiceSubmit(data: InvoiceFormValues) {
    if (!invoiceTarget) return;
    updateInvoiceMut.mutate({
      id: invoiceTarget.id,
      input: {
        fechaVencimiento: data.fechaVencimiento || undefined,
        estadoPago: data.estadoPago,
        facturaUrl: data.facturaUrl || undefined,
        facturaKey: data.facturaKey || undefined,
        facturaNombre: data.facturaNombre || undefined,
        facturaMime: data.facturaMime || undefined,
        facturaOcrTexto: data.facturaOcrTexto || undefined,
        facturaOcrJson: data.facturaOcrJson,
      },
    }, {
      onSuccess: () => {
        toast.success('Factura actualizada');
        setInvoiceDialogOpen(false);
        setInvoiceTarget(null);
      },
      onError: () => toast.error('No fue posible actualizar la factura'),
    });
  }

  const purchaseColumns: ColumnDef<Purchase>[] = [
    { accessorKey: 'fechaCompra', header: 'Fecha', cell: ({ row }) => formatDate(row.original.fechaCompra) },
    {
      accessorKey: 'numeroFactura',
      header: 'Factura',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{row.original.numeroFactura ?? '-'}</p>
          {row.original.facturaUrl ? (
            <a className="inline-flex items-center gap-1 text-xs text-primary hover:underline" href={row.original.facturaUrl} target="_blank" rel="noreferrer">
              <FileText className="size-3" />
              {invoiceFileLabel(row.original)}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">Sin adjunto</span>
          )}
        </div>
      ),
    },
    { accessorKey: 'supplier', header: 'Proveedor', cell: ({ row }) => row.original.supplier?.nombre ?? '-' },
    { accessorKey: 'total', header: 'Total', cell: ({ row }) => formatCopCentavos(row.original.total) },
    {
      accessorKey: 'fechaVencimiento',
      header: 'Vencimiento',
      cell: ({ row }) => {
        const purchase = row.original;
        if (!purchase.fechaVencimiento) return <span className="text-muted-foreground">Sin fecha</span>;
        const overdue = isOverdue(purchase);
        const dueSoon = isDueSoon(purchase);
        return (
          <div className="space-y-1">
            <p>{formatDate(purchase.fechaVencimiento)}</p>
            {overdue && <Badge variant="destructive">Vencida</Badge>}
            {!overdue && dueSoon && <Badge variant="secondary">Proxima</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: 'estadoPago',
      header: 'Pago',
      cell: ({ row }) => (
        <Badge variant={paymentStatusColors[row.original.estadoPago] ?? 'outline'}>
          {paymentStatusLabels[row.original.estadoPago] ?? row.original.estadoPago}
        </Badge>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <Badge variant={purchaseStatusColors[row.original.estado] ?? 'outline'}>{purchaseStatusLabels[row.original.estado] ?? row.original.estado}</Badge>,
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon-xs" variant="ghost" onClick={() => openInvoiceEdit(row.original)} title="Factura"><Pencil className="size-3" /></Button>
          {row.original.estado !== 'CANCELADO' ? (
            <Button size="icon-xs" variant="ghost" onClick={() => setCancelTarget(row.original)} title="Anular"><Archive className="size-3" /></Button>
          ) : null}
        </div>
      ),
    },
  ];

  const supplierColumns: ColumnDef<Supplier>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'telefono', header: 'Telefono', cell: ({ row }) => row.original.telefono ?? '-' },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email ?? '-' },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon-xs" variant="ghost" onClick={() => openSupplierEdit(row.original)} title="Editar"><Pencil className="size-3" /></Button>
          <Button size="icon-xs" variant="ghost" onClick={() => setDeleteSupplierTarget(row.original)} title="Eliminar"><Trash2 className="size-3" /></Button>
        </div>
      ),
    },
  ];

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Compras y proveedores" description="Entradas de inventario, facturas, vencimientos y proveedores.">
        <Button variant="outline" size="icon" onClick={() => void refetchPurchases()} title="Actualizar"><RefreshCw className="size-4" /></Button>
        <Button onClick={() => setPurchaseDialogOpen(true)}><PackagePlus className="size-4 mr-1" /> Nueva compra</Button>
        <Button variant="outline" onClick={() => { setEditingSupplier(null); supplierForm.reset({ nombre: '', telefono: '', email: '', direccion: '', observaciones: '' }); setSupplierDialogOpen(true); }}>
          <Plus className="size-4 mr-1" /> Nuevo proveedor
        </Button>
      </PageHeader>

      <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Compras activas" value={totals.active} icon={ShoppingCart} description="Entradas registradas" />
        <StatCard title="Cuentas por pagar" value={formatCopCentavos(totals.payable)} icon={DollarSign} description="Compras no pagadas" />
        <StatCard title="Vencidas" value={totals.overdue} icon={CalendarClock} description={`${totals.dueSoon} proximas a vencer`} />
        <StatCard title="Proveedores" value={suppliers.length} icon={UsersRound} description="Proveedores activos" />
      </StaggerList>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Select
                value={purchaseFilters.estadoPago ?? 'all'}
                onValueChange={(estadoPago) => setPurchaseFilters((current) => ({ ...current, estadoPago: estadoPago as PurchaseFilters['estadoPago'] }))}
              >
                <SelectTrigger className="w-44"><SelectValue placeholder="Estado pago" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los pagos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                  <SelectItem value="PARCIAL">Parciales</SelectItem>
                  <SelectItem value="PAGADA">Pagadas</SelectItem>
                  <SelectItem value="VENCIDA">Marcadas vencidas</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={purchaseFilters.due ?? 'all'}
                onValueChange={(due) => setPurchaseFilters((current) => ({ ...current, due: due as PurchaseFilters['due'] }))}
              >
                <SelectTrigger className="w-48"><SelectValue placeholder="Vencimiento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los vencimientos</SelectItem>
                  <SelectItem value="overdue">Vencidas</SelectItem>
                  <SelectItem value="next7">Proximas 7 dias</SelectItem>
                  <SelectItem value="next30">Proximas 30 dias</SelectItem>
                  <SelectItem value="withoutDue">Sin vencimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setPurchaseDialogOpen(true)}><PackagePlus className="size-4 mr-1" /> Nueva compra</Button>
          </div>
          {loadingPurchases ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <DataTable
              columns={purchaseColumns}
              data={purchases}
              emptyState={(
                <EmptyState
                  icon={<PackagePlus className="size-9" />}
                  title="Aun no tienes compras registradas"
                  description="Registra compras con proveedor, factura, vencimiento y adjunto para controlar inventario y cuentas por pagar."
                  action={(
                    <div className="flex flex-col items-center gap-3">
                      <Button onClick={() => setPurchaseDialogOpen(true)}><PackagePlus className="size-4 mr-1" /> Registrar compra</Button>
                      <Button variant="link" onClick={() => setTab('suppliers')}>Crear proveedor</Button>
                    </div>
                  )}
                />
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
            <DataTable
              columns={supplierColumns}
              data={suppliers}
              emptyState={(
                <EmptyState
                  icon={<UsersRound className="size-9" />}
                  title="Aun no tienes proveedores"
                  description="Registra proveedores para asociarlos a compras, facturas y costos."
                  action={<Button onClick={() => { setEditingSupplier(null); supplierForm.reset({ nombre: '', telefono: '', email: '', direccion: '', observaciones: '' }); setSupplierDialogOpen(true); }}><Plus className="size-4 mr-1" />Nuevo proveedor</Button>}
                />
              )}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar compra</DialogTitle>
          </DialogHeader>
          <form onSubmit={purchaseForm.handleSubmit(handlePurchaseSubmit)} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Proveedor</Label>
                <Select
                  value={purchaseSupplierId || NO_SUPPLIER_VALUE}
                  onValueChange={(value) => purchaseForm.setValue('supplierId', value && value !== NO_SUPPLIER_VALUE ? value : '')}
                >
                  <SelectTrigger><SelectValue placeholder="Sin proveedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUPPLIER_VALUE}>Sin proveedor</SelectItem>
                    {suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Numero de factura</Label>
                <Input {...purchaseForm.register('numeroFactura')} />
              </div>
              <div className="space-y-1">
                <Label>Fecha compra</Label>
                <Input type="date" {...purchaseForm.register('fechaCompra')} />
              </div>
              <div className="space-y-1">
                <Label>Vencimiento factura</Label>
                <Input type="date" {...purchaseForm.register('fechaVencimiento')} />
              </div>
              <div className="space-y-1">
                <Label>Estado pago</Label>
                <Select
                  value={purchasePaymentStatus || 'PENDIENTE'}
                  onValueChange={(value) => purchaseForm.setValue('estadoPago', value as PurchasePaymentStatus)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="PARCIAL">Parcial</SelectItem>
                    <SelectItem value="PAGADA">Pagada</SelectItem>
                    <SelectItem value="VENCIDA">Vencida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Observaciones</Label>
                <Input {...purchaseForm.register('observaciones')} />
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Factura adjunta</p>
                  <p className="text-xs text-muted-foreground">
                    {purchaseInvoiceName || purchaseInvoiceUrl || 'Sube una foto o PDF de la factura'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={purchaseFileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void applyInvoiceFile(file, 'create');
                    }}
                  />
                  <input
                    ref={purchaseCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void applyInvoiceFile(file, 'create');
                    }}
                  />
                  <Button type="button" variant="outline" disabled={uploadingInvoice || extractInvoiceMut.isPending} onClick={() => purchaseCameraInputRef.current?.click()}>
                    <Camera className="size-4 mr-1" /> Tomar foto
                  </Button>
                  <Button type="button" variant="outline" disabled={uploadingInvoice || extractInvoiceMut.isPending} onClick={() => purchaseFileInputRef.current?.click()}>
                    <UploadCloud className="size-4 mr-1" /> Subir factura
                  </Button>
                </div>
              </div>
              {purchaseInvoiceOcrText ? (
                <div className="mt-3 rounded-md bg-background p-3 text-xs text-muted-foreground">
                  <div className="mb-1 flex items-center gap-1 font-medium text-foreground"><Bot className="size-3" /> OCR aplicado</div>
                  {purchaseInvoiceOcrText.slice(0, 260)}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Items</Label>
              {purchaseItems.map((_, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-56 flex-1 space-y-1">
                    <Select value={purchaseItems[index]?.productId ?? ''} onValueChange={(value) => { if (value) onProductSelect(index, value); }}>
                      <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                      <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.nombre}</SelectItem>)}</SelectContent>
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
                <Button variant="outline" size="sm" type="button" onClick={addItem}><Plus className="size-4 mr-1" /> Agregar item</Button>
                <p className="text-lg font-bold">{formatCopCentavos(purchaseTotal)}</p>
              </div>
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={createPurchaseMut.isPending || uploadingInvoice}>
                <PackagePlus className="size-4 mr-1" /> Registrar compra
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={invoiceDialogOpen} onOpenChange={(open) => { setInvoiceDialogOpen(open); if (!open) setInvoiceTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Factura de compra</DialogTitle>
          </DialogHeader>
          <form onSubmit={invoiceForm.handleSubmit(handleInvoiceSubmit)} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Vencimiento</Label>
                <Input type="date" {...invoiceForm.register('fechaVencimiento')} />
              </div>
              <div className="space-y-1">
                <Label>Estado pago</Label>
                <Select
                  value={invoicePaymentStatus || 'PENDIENTE'}
                  onValueChange={(value) => invoiceForm.setValue('estadoPago', value as PurchasePaymentStatus)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="PARCIAL">Parcial</SelectItem>
                    <SelectItem value="PAGADA">Pagada</SelectItem>
                    <SelectItem value="VENCIDA">Vencida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{invoiceName || 'Sin factura adjunta'}</p>
                  {invoiceUrl ? (
                    <a className="text-xs text-primary hover:underline" href={invoiceUrl} target="_blank" rel="noreferrer">Abrir factura</a>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sube foto o PDF para dejar soporte</p>
                  )}
                </div>
                <input
                  ref={editInvoiceFileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void applyInvoiceFile(file, 'edit');
                  }}
                />
                <input
                  ref={editInvoiceCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void applyInvoiceFile(file, 'edit');
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={uploadingInvoice || extractInvoiceMut.isPending} onClick={() => editInvoiceCameraInputRef.current?.click()}>
                    <Camera className="size-4 mr-1" /> Tomar foto
                  </Button>
                  <Button type="button" variant="outline" disabled={uploadingInvoice || extractInvoiceMut.isPending} onClick={() => editInvoiceFileInputRef.current?.click()}>
                    <UploadCloud className="size-4 mr-1" /> Cambiar archivo
                  </Button>
                </div>
              </div>
            </div>

            {invoiceOcrText ? (
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <div className="mb-1 flex items-center gap-1 font-medium text-foreground"><Bot className="size-3" /> OCR aplicado</div>
                {invoiceOcrText.slice(0, 360)}
              </div>
            ) : null}

            <DialogFooter showCloseButton>
              <Button type="submit" disabled={updateInvoiceMut.isPending || uploadingInvoice}>Guardar factura</Button>
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
              <div className="space-y-1"><Label>Telefono</Label><Input {...supplierForm.register('telefono')} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" {...supplierForm.register('email')} /></div>
            </div>
            <div className="space-y-1"><Label>Direccion</Label><Input {...supplierForm.register('direccion')} /></div>
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
        description={`Anular compra ${cancelTarget?.numeroFactura ?? cancelTarget?.id}? Se reversara el stock.`}
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
        description={`Eliminar proveedor "${deleteSupplierTarget?.nombre}"?`}
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
