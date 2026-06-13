'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Ban,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Minus,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FadeIn } from '@/components/shared/fade-in';

import { formatCopCentavos, formatDateTime, formatNumber, paymentMethodLabels } from '@/lib/format';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { useProducts } from '@/hooks/use-inventory';
import { useSales, useCreateSale, useVoidSale, useRefundSale } from '@/hooks/use-pos';
import { useCustomers } from '@/hooks/use-customers';
import { useCurrentCashRegister } from '@/hooks/use-finance';
import { getBusinessProfile } from '@/services/tenant/tenant.service';
import { useQuery } from '@tanstack/react-query';
import type { Product, Sale, CustomerWithStats, PaymentMethod } from '@/types/api';

const voidSchema = z.object({
  motivo: z.string().min(1, 'Indica el motivo de la anulacion'),
});

const refundSchema = z.object({
  motivo: z.string().min(1, 'Indica el motivo de la devolucion'),
});

interface CartItem {
  product: Product;
  quantity: number;
}

function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

function refundedQty(sale: Sale, saleItemId: string): number {
  return (sale.refunds ?? [])
    .flatMap((r) => r.items)
    .filter((ri) => ri.saleItemId === saleItemId)
    .reduce((sum, ri) => sum + ri.cantidad, 0);
}

function remainingQty(sale: Sale, item: { id: string; cantidad: number }): number {
  return Math.max(item.cantidad - refundedQty(sale, item.id), 0);
}

function isRefundable(sale: Sale): boolean {
  return (
    (sale.estado ?? 'ACTIVO') === 'ACTIVO' &&
    sale.items.some((item) => remainingQty(sale, item) > 0)
  );
}

function receiptWhatsAppText(sale: Sale, businessName: string): string {
  const lines: string[] = [];
  lines.push(`*${businessName}*`);
  lines.push('='.repeat(30));
  lines.push(`Fecha: ${formatDateTime(sale.fecha)}`);
  lines.push(`Transaccion: ${sale.id.slice(0, 8).toUpperCase()}`);
  lines.push('='.repeat(30));
  lines.push('');
  lines.push('*Items:*');
  sale.items.forEach((item) => {
    lines.push(`${item.cantidad}x ${item.product?.nombre ?? item.productId}  ${formatCopCentavos(item.subtotal)}`);
  });
  lines.push('');
  lines.push('-'.repeat(30));
  lines.push(`Total: ${formatCopCentavos(sale.total)}`);
  lines.push('-'.repeat(30));
  lines.push(`Metodo de pago: ${paymentMethodLabels[sale.metodoPago] ?? sale.metodoPago}`);
  if (sale.cambio != null && sale.cambio > 0) {
    lines.push(`Cambio: ${formatCopCentavos(sale.cambio)}`);
  }
  return lines.join('\n');
}

function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && key === 'f') { e.preventDefault(); handlers.search?.(); }
      else if (ctrl && key === 'n') { e.preventDefault(); handlers.newSale?.(); }
      else if (ctrl && key === 'enter') { e.preventDefault(); handlers.charge?.(); }
      else if (key === 'escape') { handlers.cancel?.(); }
      else if (key === 'f2') { e.preventDefault(); handlers.charge?.(); }
      else if (key === 'f3') { e.preventDefault(); handlers.newSale?.(); }
      else if (key === 'f4') { e.preventDefault(); handlers.payment?.(); }
      else if (key === 'f12') { e.preventDefault(); handlers.charge?.(); }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}

export default function PosClient() {
  const { canVoidSales, token } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [quickQuantity, setQuickQuantity] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [discountPesos, setDiscountPesos] = useState(0);
  const [cashReceivedPesos, setCashReceivedPesos] = useState(0);
  const [reference, setReference] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPanel, setShowCustomerPanel] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ nombre: '', telefono: '', email: '', direccion: '' });
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidTargetSale, setVoidTargetSale] = useState<Sale | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundTargetSale, setRefundTargetSale] = useState<Sale | null>(null);
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: products = [], isLoading: loadingProducts } = useProducts({});
  const { data: sales = [], isLoading: loadingSales, refetch: refetchSales } = useSales();
  const { data: customerData } = useCustomers(
    token!,
    1,
    customerSearch.trim().length > 0 ? customerSearch : undefined,
  );
  const createSaleMut = useCreateSale();
  const voidSaleMut = useVoidSale();
  const refundSaleMut = useRefundSale();
  const { data: currentCashRegister } = useCurrentCashRegister();
  const { data: business } = useQuery({
    queryKey: queryKeys.tenant.profile,
    queryFn: () => getBusinessProfile(token!),
    enabled: !!token,
  });

  const voidForm = useForm({
    resolver: zodResolver(voidSchema),
    defaultValues: { motivo: '' },
  });

  const refundForm = useForm({
    resolver: zodResolver(refundSchema),
    defaultValues: { motivo: '' },
  });

  const customers = useMemo(() => customerData?.data ?? [], [customerData]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((p) =>
        [p.nombre, p.sku, p.barcode, p.marca]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q)),
      );
    }
    return filtered;
  }, [products, debouncedSearch]);

  const productSuggestions = useMemo(() => filteredProducts.slice(0, 8), [filteredProducts]);
  const outOfStockCount = useMemo(() => products.filter((product) => product.stock <= 0).length, [products]);
  const subtotalCentavos = cart.reduce((s, i) => s + i.product.precio * i.quantity, 0);
  const discountPercent = Math.min(Math.max(discountPesos, 0), 100);
  const discountCentavos = Math.min(Math.round(subtotalCentavos * (discountPercent / 100)), subtotalCentavos);
  const totalCentavos = subtotalCentavos - discountCentavos;
  const cashReceivedCentavos = pesosToCentavos(cashReceivedPesos);
  const changeCentavos = paymentMethod === 'EFECTIVO' ? Math.max(cashReceivedCentavos - totalCentavos, 0) : 0;
  const hasQuickCustomer = Boolean(quickCustomer.nombre.trim() && quickCustomer.telefono.trim());
  const recentSales = useMemo(() => sales.slice(0, 12), [sales]);
  const isSubmitting = createSaleMut.isPending || voidSaleMut.isPending || refundSaleMut.isPending;

  const cashSufficient = paymentMethod !== 'EFECTIVO' || cashReceivedCentavos >= totalCentavos;

  const businessName = business?.nombre ?? 'Mi Negocio';

  const addUnitsToCart = useCallback((product: Product, quantity: number) => {
    if (product.stock <= 0) return;
    const units = Math.max(1, Math.floor(quantity || 1));
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (!existing) return [...prev, { product, quantity: Math.min(units, product.stock) }];
      if (existing.quantity >= product.stock) return prev;
      return prev.map((i) =>
        i.product.id === product.id ? { ...i, quantity: Math.min(i.quantity + units, i.product.stock) } : i,
      );
    });
  }, []);

  const addQuickProduct = useCallback((product?: Product) => {
    if (!product && searchInput.trim().length === 0) {
      toast.error('Busca un producto o selecciona una sugerencia');
      return;
    }
    const target = product ?? productSuggestions.find((item) => item.stock > 0);
    if (!target) {
      toast.error('Selecciona un producto con stock disponible');
      return;
    }
    addUnitsToCart(target, quickQuantity);
    setSearchInput('');
    setDebouncedSearch('');
    setQuickQuantity(1);
  }, [addUnitsToCart, productSuggestions, quickQuantity, searchInput]);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: Math.min(Math.max(quantity, 0), i.product.stock) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountPesos(0);
    setCashReceivedPesos(0);
    setReference('');
    setSelectedCustomer(null);
    setQuickCustomer({ nombre: '', telefono: '', email: '', direccion: '' });
  }, []);

  const openVoidDialog = useCallback((sale: Sale) => {
    setVoidTargetSale(sale);
    voidForm.reset({ motivo: '' });
    setVoidDialogOpen(true);
  }, [voidForm]);

  const openRefundDialog = useCallback((sale: Sale) => {
    setRefundTargetSale(sale);
    refundForm.reset({ motivo: '' });
    setRefundQuantities(
      Object.fromEntries(
        sale.items.filter((i) => remainingQty(sale, i) > 0).map((i) => [i.id, 0]),
      ),
    );
    setRefundDialogOpen(true);
  }, [refundForm]);

  const handleCreateSale = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('Agrega productos para registrar la venta');
      return;
    }
    if (!cashSufficient) {
      toast.error('El monto recibido es insuficiente');
      return;
    }
    try {
      const sale = await createSaleMut.mutateAsync({
        customerId: selectedCustomer?.id,
        customer: !selectedCustomer && hasQuickCustomer
          ? {
              nombre: quickCustomer.nombre.trim(),
              telefono: quickCustomer.telefono.trim(),
              email: quickCustomer.email.trim() || undefined,
              direccion: quickCustomer.direccion.trim() || undefined,
            }
          : undefined,
        items: cart.map((i) => ({ productId: i.product.id, cantidad: i.quantity })),
        descuento: discountCentavos > 0 ? discountCentavos : undefined,
        metodoPago: paymentMethod,
        montoRecibido: paymentMethod === 'EFECTIVO' ? cashReceivedCentavos : undefined,
        referenciaExterna: reference.trim() || undefined,
      });
      setReceiptSale(sale);
      setReceiptDialogOpen(true);
      clearCart();
      refetchSales();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar la venta');
    }
  }, [cart, cashSufficient, selectedCustomer, hasQuickCustomer, quickCustomer, discountCentavos, paymentMethod, cashReceivedCentavos, reference, createSaleMut, clearCart, refetchSales]);

  const handleVoidSale = useCallback(async () => {
    if (!voidTargetSale) return;
    const motivo = voidForm.getValues('motivo').trim();
    try {
      await voidSaleMut.mutateAsync({ id: voidTargetSale.id, motivo: motivo || undefined });
      toast.success('Venta anulada');
      setVoidDialogOpen(false);
      setVoidTargetSale(null);
      refetchSales();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al anular la venta');
    }
  }, [voidTargetSale, voidForm, voidSaleMut, refetchSales]);

  const handleRefundSale = useCallback(async () => {
    if (!refundTargetSale) return;
    const valid = await refundForm.trigger();
    if (!valid) return;
    const { motivo } = refundForm.getValues();
    const items = refundTargetSale.items
      .map((i) => ({ saleItemId: i.id, cantidad: refundQuantities[i.id] ?? 0 }))
      .filter((i) => i.cantidad > 0);
    if (items.length === 0) {
      toast.error('Selecciona al menos un producto para devolver');
      return;
    }
    try {
      await refundSaleMut.mutateAsync({
        id: refundTargetSale.id,
        input: { motivo: motivo.trim(), items },
      });
      toast.success('Devolucion registrada');
      setRefundDialogOpen(false);
      setRefundTargetSale(null);
      setRefundQuantities({});
      refetchSales();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar devolucion');
    }
  }, [refundTargetSale, refundForm, refundQuantities, refundSaleMut, refetchSales]);

  const handleWhatsAppReceipt = useCallback(() => {
    if (!receiptSale) return;
    const text = receiptWhatsAppText(receiptSale, businessName);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [receiptSale, businessName]);

  const handleNewSale = useCallback(() => {
    setReceiptDialogOpen(false);
    setReceiptSale(null);
    clearCart();
  }, [clearCart]);

  const paymentMethods: PaymentMethod[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO'];

  useKeyboardShortcuts({
    search: () => { searchInputRef.current?.focus(); },
    newSale: () => { handleNewSale(); },
    charge: () => { formRef.current?.requestSubmit(); },
    cancel: () => { clearCart(); setVoidDialogOpen(false); setRefundDialogOpen(false); setReceiptDialogOpen(false); },
    payment: () => { setPaymentMethod((prev) => { const idx = paymentMethods.indexOf(prev); return paymentMethods[(idx + 1) % paymentMethods.length]; }); },
  });

  const saleStatusBadge = (estado?: string) => {
    switch (estado) {
      case 'ANULADA': return <Badge variant="destructive">Anulada</Badge>;
      case 'DEVUELTA': return <Badge variant="secondary">Devuelta</Badge>;
      case 'PARCIAL': return <Badge variant="outline">Parcial</Badge>;
      default: return <Badge variant="default">Activa</Badge>;
    }
  };

  return (
    <FadeIn as="main" className="-m-4 min-h-[calc(100vh-4rem)] bg-muted/25 text-foreground lg:-m-8">
      <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="flex flex-wrap items-center gap-2">
          <AlertTriangle className="size-4" />
          <span className="font-semibold">Atencion de inventario:</span>
          <span>{outOfStockCount} producto(s) agotado(s).</span>
          <a href="/admin/inventory" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
            Revisar inventario →
          </a>
          <span className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <kbd className="rounded border bg-background px-1.5 py-0.5">Ctrl+F</kbd> Buscar
            <kbd className="rounded border bg-background px-1.5 py-0.5">F3</kbd> Nueva
            <kbd className="rounded border bg-background px-1.5 py-0.5">F12</kbd> Guardar
          </span>
        </div>
      </div>
      <div className="space-y-4 p-4 lg:p-5">

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[270px_minmax(0,1fr)]">
        <div className="space-y-4 xl:order-2">
          <Card className="overflow-hidden rounded-lg border-border shadow-sm">
            <CardContent className="space-y-3 p-3">
              <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_86px_118px_42px_42px]">
                <div className="relative">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span>Producto / Articulo</span>
                    <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">F4</kbd>
                  </div>
                  <Search className="absolute bottom-2.5 left-3 size-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    className="h-10 pl-9 pr-9"
                    placeholder="Buscar por nombre, codigo, SKU..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      className="absolute bottom-2.5 right-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearchInput('')}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Cant.</Label>
                  <Input
                    className="mt-1 h-10 text-center"
                    type="number"
                    min={1}
                    value={quickQuantity}
                    onChange={(e) => setQuickQuantity(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Precio unit.</Label>
                  <Input className="mt-1 h-10" readOnly placeholder="Precio" value={productSuggestions[0] ? formatCopCentavos(productSuggestions[0].precio) : ''} />
                </div>
                <Button type="button" variant="outline" className="mt-auto h-10" title="Escanear codigo">
                  <ScanLine className="size-4" />
                </Button>
                <Button type="button" className="mt-auto h-10 bg-teal-600 hover:bg-teal-700" onClick={() => addQuickProduct()}>
                  <Plus className="size-4" />
                </Button>
              </div>

              {searchInput.trim().length > 0 && (
                <div className="flex gap-2 overflow-x-auto rounded-md border bg-background p-2">
                  {loadingProducts ? (
                    <Skeleton className="h-8 w-48" />
                  ) : productSuggestions.length === 0 ? (
                    <span className="px-2 py-1 text-xs text-muted-foreground">Sin productos para agregar</span>
                  ) : (
                    productSuggestions.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        disabled={product.stock <= 0}
                        onClick={() => addQuickProduct(product)}
                        className={cn(
                          'shrink-0 rounded-md border px-3 py-1.5 text-left text-xs transition-colors',
                          product.stock <= 0
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/30',
                        )}
                      >
                        <span className="block max-w-48 truncate font-semibold">{product.nombre}</span>
                        <span className="text-muted-foreground">{product.sku || 'Sin SKU'} · Stock {product.stock}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="overflow-hidden rounded-md border">
                <div className="max-h-[43vh] min-h-[360px] overflow-auto">
                  <table className="w-full min-w-[920px] text-sm">
                    <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
                      <tr className="border-b">
                        <th className="w-10 px-2 py-2 text-left"></th>
                        <th className="w-12 px-2 py-2 text-left">#</th>
                        <th className="w-28 px-2 py-2 text-left">Codigo</th>
                        <th className="px-2 py-2 text-left">Descripcion</th>
                        <th className="w-24 px-2 py-2 text-right">Cant.</th>
                        <th className="w-24 px-2 py-2 text-right">Dto $</th>
                        <th className="w-28 px-2 py-2 text-right">V. Unitario</th>
                        <th className="w-28 px-2 py-2 text-right">Subtotal</th>
                        <th className="w-28 px-2 py-2 text-right">Total</th>
                        <th className="w-12 px-2 py-2 text-center">Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="h-72 text-center text-muted-foreground">
                            Busca un producto y agregalo a la factura.
                          </td>
                        </tr>
                      ) : (
                        cart.map((item, index) => (
                          <tr key={item.product.id} className="border-b bg-background">
                            <td className="px-2 py-2">
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon-xs"
                                onClick={() => removeFromCart(item.product.id)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </td>
                            <td className="px-2 py-2 text-muted-foreground">{index + 1}</td>
                            <td className="px-2 py-2 font-mono text-xs">{item.product.sku || item.product.barcode || item.product.id.slice(0, 6)}</td>
                            <td className="px-2 py-2">
                              <div className="font-semibold">{item.product.nombre}</div>
                              <div className="text-xs text-muted-foreground">{item.product.category?.nombre || item.product.marca || 'Producto'}</div>
                            </td>
                            <td className="px-2 py-2 text-right">
                              <Input
                                className="ml-auto h-8 w-20 text-center"
                                type="number"
                                min={1}
                                max={item.product.stock}
                                value={item.quantity}
                                onChange={(e) => setQuantity(item.product.id, Number(e.target.value) || 0)}
                              />
                            </td>
                            <td className="px-2 py-2 text-right">
                              <Input className="ml-auto h-8 w-20 text-right" readOnly value="$0" />
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">{formatCopCentavos(item.product.precio)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{formatCopCentavos(item.product.precio * item.quantity)}</td>
                            <td className="px-2 py-2 text-right font-semibold tabular-nums text-teal-600">{formatCopCentavos(item.product.precio * item.quantity)}</td>
                            <td className="px-2 py-2 text-center text-teal-600">—</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-muted/50 text-sm">
                      <tr>
                        <td colSpan={3} className="px-4 py-2">{cart.length} item{cart.length === 1 ? '' : 's'}</td>
                        <td colSpan={2} className="px-4 py-2 text-right font-semibold">{formatNumber(cart.reduce((sum, item) => sum + item.quantity, 0))}</td>
                        <td colSpan={2} className="px-4 py-2 text-right">Totales →</td>
                        <td className="px-2 py-2 text-right font-bold">{formatCopCentavos(totalCentavos)}</td>
                        <td className="px-2 py-2 text-right font-bold text-teal-600">{formatCopCentavos(totalCentavos)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border bg-card p-3 xl:grid-cols-[minmax(260px,1fr)_minmax(340px,0.9fr)_172px]">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Subtotal bruto:</span>
                    <span>{formatCopCentavos(subtotalCentavos)}</span>
                  </div>
                  {discountCentavos > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Descuento global ({discountPercent}%):</span>
                      <span>-{formatCopCentavos(discountCentavos)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 text-lg font-black">
                    <span>TOTAL:</span>
                    <span className="text-teal-600">{formatCopCentavos(totalCentavos)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                    <Label className="text-right text-xs">
                      {paymentMethodLabels[paymentMethod] ?? paymentMethod} <kbd className="ml-1 rounded bg-muted px-1 text-[10px]">F11</kbd>:
                    </Label>
                    <Input
                      className={cn('h-10 text-right text-lg font-semibold', paymentMethod === 'EFECTIVO' && 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30')}
                      type="number"
                      min="0"
                      placeholder="$0"
                      value={paymentMethod === 'EFECTIVO' ? (cashReceivedPesos || '') : reference}
                      onChange={(e) => paymentMethod === 'EFECTIVO' ? setCashReceivedPesos(Number(e.target.value) || 0) : setReference(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                    <span className="text-right text-xs text-muted-foreground">Cambio:</span>
                    <span className={cn('text-right text-2xl font-black tabular-nums', !cashSufficient && totalCentavos > 0 ? 'text-destructive' : 'text-foreground')}>
                      {paymentMethod === 'EFECTIVO' && !cashSufficient && totalCentavos > 0
                        ? `Falta ${formatCopCentavos(totalCentavos - cashReceivedCentavos)}`
                        : formatCopCentavos(changeCentavos)}
                    </span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Button type="button" variant="secondary" className="h-10 justify-center" onClick={handleNewSale}>
                    <Receipt className="mr-2 size-4" /> Nueva <kbd className="ml-2 text-[10px]">F3</kbd>
                  </Button>
                  <Button
                    type="button"
                    className="h-10 justify-center bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting || cart.length === 0 || !cashSufficient}
                    onClick={() => formRef.current?.requestSubmit()}
                  >
                    <ShoppingCart className="mr-2 size-4" />
                    {createSaleMut.isPending ? 'Guardando...' : 'Guardar e Imprimir'}
                    <kbd className="ml-2 text-[10px]">F12</kbd>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:order-1">
          <form ref={formRef} onSubmit={handleCreateSale} className="xl:sticky xl:top-20">
            <Card className="overflow-hidden rounded-lg border-border shadow-sm">
              <CardHeader className="bg-teal-600 px-4 py-3 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">Factura de Venta</CardTitle>
                  <Badge className="bg-white/20 text-white hover:bg-white/20">
                    {currentCashRegister?.estado === 'ABIERTA' ? 'Turno' : 'Sin turno'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 pt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo Documento</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option>Factura de Venta</option>
                      <option>Recibo POS</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Fecha</Label>
                      <Input className="h-9" readOnly value={new Date().toLocaleDateString('es-CO')} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">No. Factura</Label>
                      <Input className="h-9" readOnly value="Auto" />
                    </div>
                  </div>
                </div>

                <div className="hidden max-h-52 space-y-2 overflow-y-auto">
                  {cart.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Agrega productos al carrito
                    </p>
                  )}
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.product.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCopCentavos(item.product.precio)} x {item.quantity} = {formatCopCentavos(item.product.precio * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          type="button"
                          onClick={() => setQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          type="button"
                          disabled={item.quantity >= item.product.stock}
                          onClick={() => setQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="hidden space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCopCentavos(subtotalCentavos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="font-medium text-destructive">
                      {discountCentavos > 0 ? `-${formatCopCentavos(discountCentavos)}` : '$0'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span>{formatCopCentavos(totalCentavos)}</span>
                  </div>
                  {paymentMethod === 'EFECTIVO' && changeCentavos > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Cambio</span>
                      <span className="font-medium">{formatCopCentavos(changeCentavos)}</span>
                    </div>
                  )}
                  {paymentMethod === 'EFECTIVO' && !cashSufficient && totalCentavos > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Falta</span>
                      <span className="font-medium">{formatCopCentavos(totalCentavos - cashReceivedCentavos)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="discount">Descuento Global (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={discountPesos || ''}
                    onChange={(e) => setDiscountPesos(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Metodo de pago</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={cn(
                          'rounded-lg border p-2 text-sm font-medium transition-colors',
                          paymentMethod === method
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:bg-muted',
                        )}
                        onClick={() => setPaymentMethod(method)}
                      >
                        {paymentMethodLabels[method]}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'EFECTIVO' && (
                  <div className="space-y-1">
                    <Label htmlFor="cashReceived">Efectivo recibido (COP)</Label>
                    <Input
                      id="cashReceived"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={cashReceivedPesos || ''}
                      onChange={(e) => setCashReceivedPesos(Number(e.target.value) || 0)}
                    />
                  </div>
                )}

                {(paymentMethod === 'TARJETA' || paymentMethod === 'TRANSFERENCIA' || paymentMethod === 'MIXTO') && (
                  <div className="space-y-1">
                    <Label htmlFor="reference">Referencia</Label>
                    <Input
                      id="reference"
                      placeholder="Numero de autorizacion o referencia"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Cliente</Label>
                    {selectedCustomer ? (
                      <Button variant="ghost" size="xs" type="button" onClick={() => setSelectedCustomer(null)}>
                        <X className="mr-1 size-3" /> Quitar
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="xs"
                        type="button"
                        onClick={() => setShowCustomerPanel(!showCustomerPanel)}
                      >
                        <UserRound className="mr-1 size-3" />
                        {showCustomerPanel ? 'Ocultar' : 'Agregar'}
                      </Button>
                    )}
                  </div>

                  {selectedCustomer && (
                    <div className="flex items-center gap-2 rounded-lg border p-2">
                      <UserRound className="size-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{selectedCustomer.nombre}</p>
                        <p className="truncate text-xs text-muted-foreground">{selectedCustomer.telefono}</p>
                      </div>
                      <Button variant="ghost" size="icon-xs" type="button" onClick={() => setSelectedCustomer(null)}>
                        <X className="size-3" />
                      </Button>
                    </div>
                  )}

                  {!selectedCustomer && showCustomerPanel && (
                    <div className="space-y-3 rounded-lg border p-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="Buscar cliente por nombre o telefono..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                        />
                      </div>
                      {customers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {customers.map((c) => (
                            <Button
                              key={c.id}
                              variant="outline"
                              size="xs"
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c);
                                setShowCustomerPanel(false);
                                setCustomerSearch('');
                              }}
                            >
                              {c.nombre}
                            </Button>
                          ))}
                        </div>
                      )}

                      <Separator />

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Cliente nuevo</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Nombre *"
                            value={quickCustomer.nombre}
                            onChange={(e) => setQuickCustomer({ ...quickCustomer, nombre: e.target.value })}
                          />
                          <Input
                            placeholder="Telefono *"
                            value={quickCustomer.telefono}
                            onChange={(e) => setQuickCustomer({ ...quickCustomer, telefono: e.target.value })}
                          />
                          <Input
                            placeholder="Email"
                            value={quickCustomer.email}
                            onChange={(e) => setQuickCustomer({ ...quickCustomer, email: e.target.value })}
                          />
                          <Input
                            placeholder="Direccion"
                            value={quickCustomer.direccion}
                            onChange={(e) => setQuickCustomer({ ...quickCustomer, direccion: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Forma de Pago</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option>Contado</option>
                  </select>
                </div>

                <Button
                  className="hidden w-full"
                  type="submit"
                  disabled={isSubmitting || cart.length === 0 || !cashSufficient}
                >
                  <ShoppingCart className="mr-2 size-4" />
                  {createSaleMut.isPending ? 'Registrando...' : `Cobrar ${formatCopCentavos(totalCentavos)}`}
                </Button>

                {cart.length > 0 && (
                  <Button variant="outline" type="button" className="hidden w-full" onClick={clearCart}>
                    Limpiar carrito
                  </Button>
                )}

                <Button
                  className="w-full"
                  type="button"
                  variant="outline"
                  onClick={() => { refetchSales(); }}
                >
                  <RefreshCw className="mr-2 size-4" />
                  Actualizar ventas
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSales ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : recentSales.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No hay ventas registradas</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((sale) => {
                const isExpanded = expandedSaleId === sale.id;
                const isActive = (sale.estado ?? 'ACTIVO') === 'ACTIVO';
                return (
                  <div key={sale.id} className="rounded-lg border">
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{sale.id.slice(0, 8).toUpperCase()}</span>
                          {saleStatusBadge(sale.estado)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(sale.fecha)} &middot; {sale.customer?.nombre ?? 'Sin cliente'} &middot; {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatCopCentavos(sale.total)}</span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                        >
                          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </Button>
                        {canVoidSales && isActive && isRefundable(sale) && (
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={isSubmitting}
                            onClick={() => openRefundDialog(sale)}
                          >
                            <RotateCcw className="mr-1 size-3" />
                            Devolver
                          </Button>
                        )}
                        {canVoidSales && isActive && (
                          <Button
                            variant="destructive"
                            size="xs"
                            disabled={isSubmitting}
                            onClick={() => openVoidDialog(sale)}
                          >
                            <Ban className="mr-1 size-3" />
                            Anular
                          </Button>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t p-3 pt-2 space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Pago: {paymentMethodLabels[sale.metodoPago] ?? sale.metodoPago}
                          {sale.cambio != null && sale.cambio > 0 && ` · Cambio: ${formatCopCentavos(sale.cambio)}`}
                        </div>
                        {sale.items.map((item) => {
                          const refunded = refundedQty(sale, item.id);
                          return (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>
                                {item.product?.nombre ?? item.productId}
                                <span className="text-muted-foreground"> x{item.cantidad}</span>
                                {refunded > 0 && <span className="text-destructive"> (devueltos: {refunded})</span>}
                              </span>
                              <span>{formatCopCentavos(item.subtotal)}</span>
                            </div>
                          );
                        })}
                        {(sale.descuento > 0 || sale.impuestos > 0) && (
                          <div className="flex justify-between text-sm text-muted-foreground border-t pt-1 mt-1">
                            <span>Subtotal</span>
                            <span>{formatCopCentavos(sale.subtotal)}</span>
                          </div>
                        )}
                        {sale.descuento > 0 && (
                          <div className="flex justify-between text-sm text-destructive">
                            <span>Descuento</span>
                            <span>-{formatCopCentavos(sale.descuento)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-semibold border-t pt-1">
                          <span>Total</span>
                          <span>{formatCopCentavos(sale.total)}</span>
                        </div>
                        {(sale.refunds ?? []).length > 0 && (
                          <div className="border-t pt-1 mt-1">
                            <p className="text-xs font-medium text-destructive">Devoluciones</p>
                            {sale.refunds!.map((refund) => (
                              <p key={refund.id} className="text-xs text-muted-foreground">
                                {formatDateTime(refund.fecha)} - {formatCopCentavos(refund.total)}
                                {refund.motivo && ` (${refund.motivo})`}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      </div>

      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular venta</DialogTitle>
            <DialogDescription>
              {voidTargetSale
                ? `Venta ${voidTargetSale.id.slice(0, 8).toUpperCase()} - ${formatCopCentavos(voidTargetSale.total)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={voidForm.handleSubmit(handleVoidSale)}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="voidMotivo">Motivo de anulacion</Label>
              <Textarea
                id="voidMotivo"
                placeholder="Describe el motivo..."
                {...voidForm.register('motivo')}
              />
              {voidForm.formState.errors.motivo && (
                <p className="text-xs text-destructive">{voidForm.formState.errors.motivo.message}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setVoidDialogOpen(false)}
                disabled={voidSaleMut.isPending}
              >
                Cancelar
              </Button>
              <Button variant="destructive" type="submit" disabled={voidSaleMut.isPending}>
                {voidSaleMut.isPending ? 'Anulando...' : 'Anular venta'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={refundDialogOpen} onOpenChange={(open: boolean) => { setRefundDialogOpen(open); if (!open) setRefundTargetSale(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Devolucion parcial</DialogTitle>
            <DialogDescription>
              {refundTargetSale
                ? `Venta ${refundTargetSale.id.slice(0, 8).toUpperCase()} - Selecciona los productos y cantidades a devolver`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {refundTargetSale && (
            <form onSubmit={refundForm.handleSubmit(handleRefundSale)} className="space-y-4">
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {refundTargetSale.items.map((item) => {
                  const remaining = remainingQty(refundTargetSale, item);
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border p-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.product?.nombre ?? item.productId}</p>
                        <p className="text-xs text-muted-foreground">
                          Vendido: {item.cantidad} &middot; Disponible: {remaining} &middot; {formatCopCentavos(item.precioUnitario)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={remaining}
                        disabled={remaining === 0}
                        className="w-20"
                        value={refundQuantities[item.id] ?? 0}
                        onChange={(e) =>
                          setRefundQuantities((prev) => ({
                            ...prev,
                            [item.id]: Math.min(Math.max(Number(e.target.value) || 0, 0), remaining),
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1">
                <Label htmlFor="refundMotivo">Motivo de devolucion</Label>
                <Textarea id="refundMotivo" placeholder="Describe el motivo..." {...refundForm.register('motivo')} />
                {refundForm.formState.errors.motivo && (
                  <p className="text-xs text-destructive">{refundForm.formState.errors.motivo.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setRefundDialogOpen(false)} disabled={refundSaleMut.isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={refundSaleMut.isPending}>
                  <RotateCcw className="mr-2 size-4" />
                  {refundSaleMut.isPending ? 'Procesando...' : 'Registrar devolucion'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5" />
              Recibo de venta
            </DialogTitle>
          </DialogHeader>
          {receiptSale && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="text-center">
                  <p className="font-bold text-base">{businessName}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(receiptSale.fecha)}</p>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaccion</span>
                  <span className="font-mono font-semibold">{receiptSale.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <Separator />
                <ScrollArea className="max-h-48">
                  <div className="space-y-1.5">
                    {receiptSale.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="flex-1">
                          {item.product?.nombre ?? item.productId}
                          <span className="text-muted-foreground"> x{item.cantidad}</span>
                        </span>
                        <span className="font-medium tabular-nums">{formatCopCentavos(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Separator />
                {receiptSale.descuento > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Descuento</span>
                    <span>-{formatCopCentavos(receiptSale.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCopCentavos(receiptSale.total)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Metodo de pago</span>
                  <span className="font-medium">{paymentMethodLabels[receiptSale.metodoPago] ?? receiptSale.metodoPago}</span>
                </div>
                {receiptSale.cambio != null && receiptSale.cambio > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Cambio</span>
                    <span className="font-medium">{formatCopCentavos(receiptSale.cambio)}</span>
                  </div>
                )}
                {receiptSale.customer && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{receiptSale.customer.nombre}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReceiptDialogOpen(false)}>
                  Cerrar
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleWhatsAppReceipt}>
                  <MessageCircle className="mr-2 size-4" />
                  WhatsApp
                </Button>
                <Button className="flex-1" onClick={handleNewSale}>
                  <ShoppingCart className="mr-2 size-4" />
                  Nueva venta
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
