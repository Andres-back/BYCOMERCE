'use client';

import { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  ShoppingBag,
  Users,
  Package,
  AlertTriangle,
  ClipboardList,
  Wallet,
  RefreshCw,
  ShoppingCart,
  UserPlus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { useDashboardReport, useSalesReport, useProductsReport, useInventoryReport, useCustomersReport } from '@/hooks/use-reports';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { PageHeader } from '@/components/layouts/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCopCentavos, formatNumber, formatDate, paymentMethodLabels } from '@/lib/format';
import type { ColumnDef } from '@tanstack/react-table';

const CHART_1 = '#0f766e';
const CHART_2 = '#14b8a6';
const PIE_COLORS = ['#0f766e', '#14b8a6', '#6366f1', '#f59e0b', '#ef4444'];

const movementTypeLabels: Record<string, string> = {
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  AJUSTE: 'Ajuste',
  DEVOLUCION: 'Devolución',
  PERDIDA: 'Pérdida',
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      {label && <p className="mb-1 text-xs text-muted-foreground">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium">{formatCopCentavos(entry.value)}</p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { metodo: string; total: number; count: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="mb-1 text-sm font-medium">{paymentMethodLabels[d.metodo] ?? d.metodo}</p>
      <p className="text-xs text-muted-foreground">{formatCopCentavos(d.total)}</p>
      <p className="text-xs text-muted-foreground">{formatNumber(d.count)} transacciones</p>
    </div>
  );
}

export default function ReportsClient() {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState('dashboard');

  const filters = useMemo(() => ({ from, to }), [from, to]);

  const dashboard = useDashboardReport(filters);
  const sales = useSalesReport(filters);
  const products = useProductsReport(filters);
  const inventory = useInventoryReport();
  const customers = useCustomersReport(filters);

  function refetchAll() {
    dashboard.refetch();
    sales.refetch();
    products.refetch();
    inventory.refetch();
    customers.refetch();
  }

  const kpis = dashboard.data?.kpis;
  const topProducts = dashboard.data?.topProducts ?? [];
  const recentOrders = dashboard.data?.recentOrders ?? [];
  const dailySales = (sales.data?.daily ?? []).map((d) => ({ ...d, dateLabel: formatDate(d.date) }));
  const paymentMethods = sales.data?.paymentMethods ?? [];
  const salesSummary = sales.data?.summary;
  const productsTop = products.data?.topProducts ?? [];
  const noMovement = products.data?.withoutMovement ?? [];
  const invLowStock = inventory.data?.lowStock ?? [];
  const invOutOfStock = inventory.data?.outOfStock ?? [];
  const recentMovements = inventory.data?.recentMovements ?? [];
  const topCustomers = customers.data?.topCustomers ?? [];

  function handleRefresh() {
    refetchAll();
    toast.success('Reportes actualizados');
  }

  const dashboardKpiCards = [
    { title: 'Ventas Hoy', value: formatCopCentavos(kpis?.salesToday ?? 0), icon: DollarSign },
    { title: 'Ventas del Mes', value: formatCopCentavos(kpis?.salesMonth ?? 0), icon: TrendingUp, trend: kpis?.salesGrowthPercent != null ? { value: kpis.salesGrowthPercent, label: 'vs periodo anterior' } : undefined },
    { title: 'Transacciones', value: formatNumber(kpis?.transactions ?? 0), icon: Receipt },
    { title: 'Ticket Promedio', value: formatCopCentavos(kpis?.averageTicket ?? 0), icon: ShoppingBag },
    { title: 'Ganancia Estimada', value: formatCopCentavos(kpis?.estimatedProfit ?? 0), icon: Wallet },
    { title: 'Pedidos Activos', value: formatNumber(kpis?.activeOrders ?? 0), icon: ClipboardList },
    { title: 'Bajo Stock', value: formatNumber(kpis?.lowStock ?? 0), icon: AlertTriangle },
    { title: 'Nuevos Clientes', value: formatNumber(kpis?.customersNew ?? 0), icon: UserPlus },
  ];

  const dashboardTopProductsCols = useMemo<ColumnDef<typeof topProducts[number], unknown>[]>(() => [
    { accessorKey: 'product.nombre', header: 'Producto', cell: ({ row }) => row.original.product?.nombre ?? row.original.productId.slice(0, 8) },
    { accessorKey: 'quantity', header: 'Vendidos', cell: ({ row }) => formatNumber(row.original.quantity) },
    { accessorKey: 'total', header: 'Ingresos', cell: ({ row }) => formatCopCentavos(row.original.total) },
  ], []);

  const salesKpiCards = [
    { title: 'Total Vendido', value: formatCopCentavos(salesSummary?.total ?? 0), icon: DollarSign },
    { title: 'Transacciones', value: formatNumber(salesSummary?.count ?? 0), icon: Receipt },
    { title: 'Ticket Promedio', value: formatCopCentavos(salesSummary?.averageTicket ?? 0), icon: ShoppingBag },
    { title: 'Descuentos', value: formatCopCentavos(salesSummary?.descuento ?? 0), icon: TrendingUp },
  ];

  const productsTopCols = useMemo<ColumnDef<typeof productsTop[number], unknown>[]>(() => [
    { accessorKey: 'product.nombre', header: 'Producto', cell: ({ row }) => row.original.product?.nombre ?? row.original.productId.slice(0, 8) },
    { accessorKey: 'quantity', header: 'Vendidos', cell: ({ row }) => formatNumber(row.original.quantity) },
    { accessorKey: 'total', header: 'Ingresos', cell: ({ row }) => formatCopCentavos(row.original.total) },
  ], []);

  const noMovementCols = useMemo<ColumnDef<typeof noMovement[number], unknown>[]>(() => [
    { accessorKey: 'nombre', header: 'Producto' },
    { accessorKey: 'stock', header: 'Stock', cell: ({ row }) => formatNumber(row.original.stock) },
    { accessorKey: 'precio', header: 'Precio', cell: ({ row }) => formatCopCentavos(row.original.precio) },
  ], []);

  const lowStockCols = useMemo<ColumnDef<typeof invLowStock[number], unknown>[]>(() => [
    { accessorKey: 'nombre', header: 'Producto' },
    { accessorKey: 'stock', header: 'Stock', cell: ({ row }) => <span className="text-amber-600 font-medium">{formatNumber(row.original.stock)}</span> },
    { accessorKey: 'stockMinimo', header: 'Stock Mínimo', cell: ({ row }) => formatNumber(row.original.stockMinimo) },
  ], []);

  const outOfStockCols = useMemo<ColumnDef<typeof invOutOfStock[number], unknown>[]>(() => [
    { accessorKey: 'nombre', header: 'Producto' },
    { accessorKey: 'stock', header: 'Stock', cell: () => <Badge variant="destructive">Agotado</Badge> },
  ], []);

  const movementCols = useMemo<ColumnDef<typeof recentMovements[number], unknown>[]>(() => [
    { accessorKey: 'fecha', header: 'Fecha', cell: ({ row }) => formatDate(row.original.fecha) },
    { accessorKey: 'product.nombre', header: 'Producto', cell: ({ row }) => row.original.product?.nombre ?? '-' },
    { accessorKey: 'tipo', header: 'Tipo', cell: ({ row }) => movementTypeLabels[row.original.tipo] ?? row.original.tipo },
    { accessorKey: 'cantidad', header: 'Cantidad', cell: ({ row }) => formatNumber(row.original.cantidad) },
  ], []);

  const topCustomersCols = useMemo<ColumnDef<typeof topCustomers[number], unknown>[]>(() => [
    { accessorKey: 'customer.nombre', header: 'Cliente', cell: ({ row }) => row.original.customer?.nombre ?? 'Anónimo' },
    { accessorKey: 'purchases', header: 'Compras', cell: ({ row }) => formatNumber(row.original.purchases) },
    { accessorKey: 'total', header: 'Total Gastado', cell: ({ row }) => formatCopCentavos(row.original.total) },
  ], []);

  function renderSkeletonCards(count: number) {
    return Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-6">
          <Skeleton className="mb-2 h-4 w-20" />
          <Skeleton className="h-6 w-28" />
        </CardContent>
      </Card>
    ));
  }

  function renderSkeletonTable(rows = 5) {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  function renderSkeletonChart() {
    return <Skeleton className="h-[300px] w-full" />;
  }

  return (
    <FadeIn as="main" className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Reportes" description="Indicadores detallados del negocio">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">Desde</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-full sm:w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">Hasta</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-full sm:w-40" />
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRefresh} title="Actualizar">
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </PageHeader>

      <FadeIn delay={0.2}><Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dashboard.isLoading ? renderSkeletonCards(8) : dashboardKpiCards.map((kpi, i) => (
              <StatCard key={i} title={kpi.title} value={kpi.value} icon={kpi.icon} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Ventas</CardTitle>
              </CardHeader>
              <CardContent>
                {sales.isLoading ? renderSkeletonChart() : dailySales.length === 0 ? (
                  <EmptyState title="Sin datos de ventas" description="No hay ventas en el periodo seleccionado." />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailySales}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_1} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_1} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v: string) => { const d = new Date(v + 'T12:00:00'); return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }); }} />
                      <YAxis width={100} tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCopCentavos(v)} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="total" stroke={CHART_1} fill="url(#salesGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Productos más Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.isLoading ? renderSkeletonChart() : topProducts.length === 0 ? (
                  <EmptyState title="Sin datos" description="No hay productos vendidos en el periodo." />
                ) : (
                  <DataTable columns={dashboardTopProductsCols} data={topProducts.slice(0, 10)} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.isLoading ? renderSkeletonTable() : recentOrders.length === 0 ? (
                <EmptyState title="Sin pedidos recientes" />
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">Cliente</th>
                        <th className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">Estado</th>
                        <th className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                        <th className="h-10 px-3 text-right text-xs font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.slice(0, 10).map((order) => (
                        <tr key={order.id} className="border-b last:border-0">
                          <td className="p-3 text-sm font-medium">{order.customerName ?? 'Cliente'}</td>
                          <td className="p-3">
                            <Badge variant={order.estado === 'CANCELADA' || order.estado === 'RECHAZADA' ? 'destructive' : order.estado === 'ENTREGADA' ? 'outline' : 'default'}>
                              {order.estado}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{formatDate(order.fecha)}</td>
                          <td className="p-3 text-sm text-right font-medium">{formatCopCentavos(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ventas" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sales.isLoading ? renderSkeletonCards(4) : salesKpiCards.map((kpi, i) => (
              <StatCard key={i} title={kpi.title} value={kpi.value} icon={kpi.icon} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ventas por Día</CardTitle>
              </CardHeader>
              <CardContent>
                {sales.isLoading ? renderSkeletonChart() : dailySales.length === 0 ? (
                  <EmptyState title="Sin datos de ventas" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailySales}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v: string) => { const d = new Date(v + 'T12:00:00'); return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }); }} />
                      <YAxis width={100} tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCopCentavos(v)} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="total" fill={CHART_2} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                {sales.isLoading ? renderSkeletonChart() : paymentMethods.length === 0 ? (
                  <EmptyState title="Sin datos" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={paymentMethods.map(pm => ({ ...pm, name: paymentMethodLabels[pm.metodo] ?? pm.metodo }))} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                        {paymentMethods.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="productos" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Productos Más Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {products.isLoading ? renderSkeletonTable() : productsTop.length === 0 ? (
                <EmptyState title="Sin datos de productos" description="No hay productos vendidos en el periodo." />
              ) : (
                <DataTable columns={productsTopCols} data={productsTop} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos sin Movimiento</CardTitle>
            </CardHeader>
            <CardContent>
              {products.isLoading ? renderSkeletonTable() : noMovement.length === 0 ? (
                <EmptyState title="Todos los productos tienen movimiento" icon={<Package className="size-10 text-muted-foreground" />} />
              ) : (
                <DataTable columns={noMovementCols} data={noMovement} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventario" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {inventory.isLoading ? renderSkeletonCards(4) : (
              <>
                <StatCard title="Valor del Inventario" value={formatCopCentavos(inventory.data?.stockValue ?? 0)} icon={Wallet} />
                <StatCard title="Total Productos" value={formatNumber(inventory.data?.totalProducts ?? 0)} icon={Package} />
                <StatCard title="Total Unidades" value={formatNumber(inventory.data?.totalUnits ?? 0)} icon={ShoppingCart} />
                <StatCard title="Bajo Stock" value={formatNumber(invLowStock.length)} icon={AlertTriangle} description={`${invOutOfStock.length} agotados`} />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Productos Bajo Stock</CardTitle>
              </CardHeader>
              <CardContent>
                {inventory.isLoading ? renderSkeletonTable() : invLowStock.length === 0 ? (
                  <EmptyState title="Sin productos con bajo stock" />
                ) : (
                  <DataTable columns={lowStockCols} data={invLowStock} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Productos Agotados</CardTitle>
              </CardHeader>
              <CardContent>
                {inventory.isLoading ? renderSkeletonTable() : invOutOfStock.length === 0 ? (
                  <EmptyState title="Sin productos agotados" icon={<Package className="size-10 text-muted-foreground" />} />
                ) : (
                  <DataTable columns={outOfStockCols} data={invOutOfStock} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Movimientos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {inventory.isLoading ? renderSkeletonTable() : recentMovements.length === 0 ? (
                <EmptyState title="Sin movimientos recientes" />
              ) : (
                <DataTable columns={movementCols} data={recentMovements} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {customers.isLoading ? renderSkeletonCards(2) : (
              <>
                <StatCard title="Clientes Nuevos" value={formatNumber(customers.data?.newCustomers ?? 0)} icon={UserPlus} description="En el periodo seleccionado" />
                <StatCard title="Total Clientes" value={formatNumber(customers.data?.total ?? 0)} icon={Users} />
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              {customers.isLoading ? renderSkeletonTable() : topCustomers.length === 0 ? (
                <EmptyState title="Sin datos de clientes" description="No hay clientes en el periodo seleccionado." />
              ) : (
                <DataTable columns={topCustomersCols} data={topCustomers} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs></FadeIn>
    </FadeIn>
  );
}
