'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Ban,
  ChevronDown,
  ChevronUp,
  DollarSign,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  UserRound,
  Wallet,
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
import { StatCard } from '@/components/shared/stat-card';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';

import { formatCopCentavos, formatDateTime, formatNumber, paymentMethodLabels, availabilityLabel, availabilityVariant } from '@/lib/format';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { useProducts, useCategories } from '@/hooks/use-inventory';
import { useSales, useCreateSale, useVoidSale, useRefundSale } from '@/hooks/use-pos';
import { useCustomers } from '@/hooks/use-customers';
import { useDashboardReport } from '@/hooks/use-reports';
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

export default function PosClient() {
  const { canVoidSales, token } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: products = [], isLoading: loadingProducts } = useProducts({});
  const { data: categories = [] } = useCategories();
  const { data: sales = [], isLoading: loadingSales, refetch: refetchSales } = useSales();
  const { data: customerData } = useCustomers(
    token!,
    1,
    customerSearch.trim().length > 0 ? customerSearch : undefined,
  );
  const createSaleMut = useCreateSale();
  const voidSaleMut = useVoidSale();
  const refundSaleMut = useRefundSale();
  const { data: dashboardKpis, isLoading: loadingDashboard } = useDashboardReport();
  const { data: currentCashRegister, isLoading: loadingCashRegister } = useCurrentCashRegister();
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

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const todayProductsSold = useMemo(() => {
    return sales
      .filter((s) => s.fecha >= todayStart && (s.estado ?? 'ACTIVO') === 'ACTIVO')
      .reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.cantidad, 0), 0);
  }, [sales, todayStart]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category?.id === selectedCategory);
    }
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((p) =>
        [p.nombre, p.sku, p.barcode, p.marca]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q)),
      );
    }
    return filtered;
  }, [products, selectedCategory, debouncedSearch]);

  const subtotalCentavos = cart.reduce((s, i) => s + i.product.precio * i.quantity, 0);
  const discountCentavos = Math.min(Math.max(pesosToCentavos(discountPesos), 0), subtotalCentavos);
  const totalCentavos = subtotalCentavos - discountCentavos;
  const cashReceivedCentavos = pesosToCentavos(cashReceivedPesos);
  const changeCentavos = paymentMethod === 'EFECTIVO' ? Math.max(cashReceivedCentavos - totalCentavos, 0) : 0;
  const hasQuickCustomer = Boolean(quickCustomer.nombre.trim() && quickCustomer.telefono.trim());
  const recentSales = useMemo(() => sales.slice(0, 12), [sales]);
  const isSubmitting = createSaleMut.isPending || voidSaleMut.isPending || refundSaleMut.isPending;

  const cashSufficient = paymentMethod !== 'EFECTIVO' || cashReceivedCentavos >= totalCentavos;

  const businessName = business?.nombre ?? 'Mi Negocio';

  const cashRegisterBalance = useMemo(() => {
    if (!currentCashRegister) return null;
    if (currentCashRegister.saldoEsperado != null) return currentCashRegister.saldoEsperado;
    const ingresos = currentCashRegister.ingresos ?? 0;
    const egresos = currentCashRegister.egresos ?? 0;
    return currentCashRegister.saldoInicial + ingresos - egresos;
  }, [currentCashRegister]);

  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (!existing) return [...prev, { product, quantity: 1 }];
      if (existing.quantity >= product.stock) return prev;
      return prev.map((i) =>
        i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
      );
    });
  }, []);

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

  const saleStatusBadge = (estado?: string) => {
    switch (estado) {
      case 'ANULADA': return <Badge variant="destructive">Anulada</Badge>;
      case 'DEVUELTA': return <Badge variant="secondary">Devuelta</Badge>;
      case 'PARCIAL': return <Badge variant="outline">Parcial</Badge>;
      default: return <Badge variant="default">Activa</Badge>;
    }
  };

  return (
    <FadeIn as="main" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Punto de Venta</h1>
          <p className="text-sm text-muted-foreground">Registro rapido de ventas y cobros</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => { refetchSales(); }}
          title="Actualizar"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      <StaggerList><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loadingDashboard ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))
        ) : (
          <>
            <StatCard
              title="Ventas hoy"
              value={formatCopCentavos(dashboardKpis?.kpis.salesToday ?? 0)}
              icon={DollarSign}
            />
            <StatCard
              title="Productos vendidos hoy"
              value={formatNumber(todayProductsSold)}
              icon={Package}
            />
            {loadingCashRegister ? (
              <Skeleton className="h-24 rounded-lg" />
            ) : (
              <StatCard
                title="Caja actual"
                value={currentCashRegister?.estado === 'ABIERTA' && cashRegisterBalance != null
                  ? `${currentCashRegister.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'} - ${formatCopCentavos(cashRegisterBalance)}`
                  : 'Sin caja abierta'}
                icon={Wallet}
                description={currentCashRegister?.estado === 'ABIERTA'
                  ? `Abierta ${formatDateTime(currentCashRegister.fechaApertura)}`
                  : undefined}
              />
            )}
            <StatCard
              title="Ticket promedio"
              value={formatCopCentavos(dashboardKpis?.kpis.averageTicket ?? 0)}
              icon={TrendingUp}
            />
          </>
        )}
      </div></StaggerList>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nombre, SKU o codigo de barras..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchInput('')}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  Todos
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.nombre}
                  </Button>
                ))}
              </div>

              {loadingProducts ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-lg" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">No se encontraron productos</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((i) => i.product.id === product.id);
                    const isLowStock = product.stock > 0 && product.stock <= product.stockMinimo;
                    const isOutOfStock = product.stock <= 0;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        disabled={isOutOfStock}
                        className={cn(
                          'relative flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
                          isOutOfStock ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted/50',
                          inCart ? 'border-primary bg-primary/5' : 'border-border',
                        )}
                        onClick={() => addToCart(product)}
                      >
                        {inCart && (
                          <Badge className="absolute -right-1 -top-1 size-5 items-center justify-center p-0 text-[10px]">
                            {inCart.quantity}
                          </Badge>
                        )}
                        <span className="line-clamp-2 text-sm font-medium leading-tight">
                          {product.nombre}
                        </span>
                        <span className="text-sm font-semibold">
                          {formatCopCentavos(product.precio)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={availabilityVariant(product)}
                            className="text-[10px]"
                          >
                            {availabilityLabel(product)}
                          </Badge>
                          {isLowStock && (
                            <Badge variant="secondary" className="text-[10px]">
                              Min: {product.stockMinimo}
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <form onSubmit={handleCreateSale} className="lg:sticky lg:top-20">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="size-5" />
                    Venta
                  </CardTitle>
                  {cart.length > 0 && (
                    <Badge variant="secondary">{cart.length} item{cart.length !== 1 ? 's' : ''}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-52 space-y-2 overflow-y-auto">
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

                <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
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
                  <Label htmlFor="discount">Descuento (COP)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
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
                      <Button variant="ghost" size="xs" type="button" onClick={clearCart}>
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

                <Button
                  className="w-full"
                  type="submit"
                  disabled={isSubmitting || cart.length === 0 || !cashSufficient}
                >
                  <ShoppingCart className="mr-2 size-4" />
                  {createSaleMut.isPending ? 'Registrando...' : `Cobrar ${formatCopCentavos(totalCentavos)}`}
                </Button>

                {cart.length > 0 && (
                  <Button variant="outline" type="button" className="w-full" onClick={clearCart}>
                    Limpiar carrito
                  </Button>
                )}
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
                const isVoided = (sale.estado ?? 'ACTIVO') === 'ANULADA';
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
