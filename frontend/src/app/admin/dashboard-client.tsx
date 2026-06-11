'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, Receipt, ShoppingBag, PiggyBank,
  ClipboardList, AlertTriangle, Wallet, RefreshCw, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { getDashboardReport, getSalesReport, getInventoryReport } from '@/services/reports/reports.service';
import { queryKeys } from '@/lib/query-keys';
import { formatCopCentavos, formatNumber, formatDate, orderStatusLabels, orderStatusColors } from '@/lib/format';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { PageHeader } from '@/components/layouts/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type DateRange = 'today' | '7days' | '30days' | 'month';

const RANGE_LABELS: Record<DateRange, string> = {
  today: 'Hoy', '7days': '7 días', '30days': '30 días', month: 'Este mes',
};

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeRange(type: DateRange) {
  const now = new Date();
  const today = toISODate(now);
  switch (type) {
    case 'today': return { from: today, to: today };
    case '7days': return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)), to: today };
    case '30days': return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)), to: today };
    case 'month': return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
}

export default function DashboardClient() {
  const { token } = useAuth();
  const [range, setRange] = useState<DateRange>('7days');
  const { from, to } = useMemo(() => computeRange(range), [range]);

  const dashboard = useQuery({
    queryKey: queryKeys.reports.dashboard({ from, to }),
    queryFn: () => getDashboardReport(token!, { from, to }),
    enabled: !!token,
  });

  const sales = useQuery({
    queryKey: queryKeys.reports.sales({ from, to }),
    queryFn: () => getSalesReport(token!, { from, to }),
    enabled: !!token,
  });

  const inventory = useQuery({
    queryKey: queryKeys.reports.inventory,
    queryFn: () => getInventoryReport(token!),
    enabled: !!token,
  });

  const isLoading = dashboard.isLoading || sales.isLoading || inventory.isLoading;

  useEffect(() => {
    if (dashboard.error) toast.error('No fue posible cargar el dashboard');
  }, [dashboard.error]);
  useEffect(() => {
    if (sales.error) toast.error('No fue posible cargar el reporte de ventas');
  }, [sales.error]);

  const kpis = dashboard.data?.kpis;
  const topProducts = dashboard.data?.topProducts ?? [];
  const recentOrders = dashboard.data?.recentOrders ?? [];
  const dailyData = (sales.data?.daily ?? []).map((d) => ({ ...d, dateLabel: formatDate(d.date) }));
  const chartProducts = topProducts.slice(0, 8).map((item) => ({
    name: (item.product?.nombre ?? item.productId.slice(0, 8)).slice(0, 25),
    total: item.total,
    quantity: item.quantity,
  }));

  function handleRefresh() { dashboard.refetch(); sales.refetch(); inventory.refetch(); }

  const kpiCards = [
    { key: 'salesToday', title: 'Ventas Hoy', value: formatCopCentavos(kpis?.salesToday ?? 0), icon: DollarSign },
    { key: 'salesMonth', title: 'Ventas del Mes', value: formatCopCentavos(kpis?.salesMonth ?? 0), icon: TrendingUp },
    { key: 'transactions', title: 'Transacciones', value: formatNumber(kpis?.transactions ?? 0), icon: Receipt },
    { key: 'averageTicket', title: 'Ticket Promedio', value: formatCopCentavos(kpis?.averageTicket ?? 0), icon: ShoppingBag },
    { key: 'estimatedProfit', title: 'Ganancia Estimada', value: formatCopCentavos(kpis?.estimatedProfit ?? 0), icon: PiggyBank },
    { key: 'activeOrders', title: 'Pedidos Activos', value: formatNumber(kpis?.activeOrders ?? 0), icon: ClipboardList },
    { key: 'lowStock', title: 'Bajo Stock', value: formatNumber(kpis?.lowStock ?? 0), icon: AlertTriangle },
    { key: 'cashBalance', title: 'Balance en Caja', value: formatCopCentavos(kpis?.cashBalance ?? 0), icon: Wallet },
  ];

  return (
    <FadeIn as="main" className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Dashboard" description="Indicadores operativos y métricas del negocio">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm">
            {(Object.keys(RANGE_LABELS) as DateRange[]).map((key) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  range === key ? 'bg-teal-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900',
                )}
              >
                {RANGE_LABELS[key]}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading} className="border-gray-200">
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <StaggerList><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-gray-100">
              <CardContent className="p-5"><Skeleton className="mb-3 h-4 w-20" /><Skeleton className="h-7 w-32" /></CardContent>
            </Card>
          ))
        ) : (
          kpiCards.map((kpi) => <StatCard key={kpi.key} title={kpi.title} value={kpi.value} icon={kpi.icon} />)
        )}
      </div></StaggerList>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn delay={0.2}><Card className="overflow-hidden border-gray-100 shadow-sm">
          <CardHeader className="border-b border-gray-50">
            <CardTitle className="text-base">Tendencia de Ventas</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : dailyData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">Sin datos de ventas en este período</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: string) => { const d = new Date(v + 'T12:00:00'); return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }); }} />
                  <YAxis width={90} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: number) => formatCopCentavos(v)} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-lg"><p className="text-xs text-gray-500 mb-1">{label}</p><p className="text-sm font-bold text-teal-700">{formatCopCentavos(Number(payload[0].value ?? 0))}</p></div> : null} />
                  <Area type="monotone" dataKey="total" stroke="#0d9488" fill="url(#salesGradient)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card></FadeIn>

        <FadeIn delay={0.3}><Card className="overflow-hidden border-gray-100 shadow-sm">
          <CardHeader className="border-b border-gray-50">
            <CardTitle className="text-base">Productos más Vendidos</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3"><Skeleton className="h-6 w-full rounded-lg" /><Skeleton className="h-6 w-3/4 rounded-lg" /><Skeleton className="h-6 w-1/2 rounded-lg" /></div>
            ) : chartProducts.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">Sin datos de productos</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: number) => formatCopCentavos(v)} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-lg"><p className="text-xs text-gray-500 mb-1">{label}</p><p className="text-sm font-bold text-emerald-700">{formatCopCentavos(Number(payload[0].value ?? 0))}</p></div> : null} />
                  <Bar dataKey="total" fill="#14b8a6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card></FadeIn>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border-gray-100 shadow-sm">
          <CardHeader className="border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div><CardTitle className="text-base">Pedidos Recientes</CardTitle><p className="text-xs text-gray-500 mt-0.5">Últimos pedidos del catálogo</p></div>
              {!isLoading && recentOrders.length > 0 && <Badge variant="secondary" className="rounded-full">{recentOrders.length}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-5"><Skeleton className="h-10 w-full rounded-lg" /><Skeleton className="h-10 w-full rounded-lg" /><Skeleton className="h-10 w-3/4 rounded-lg" /></div>
            ) : recentOrders.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-gray-400">No hay pedidos recientes</div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="text-xs font-semibold text-gray-500">Cliente</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Fecha</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-gray-500">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.slice(0, 10).map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900">{order.customerName ?? 'Cliente'}</TableCell>
                      <TableCell><Badge variant={orderStatusColors[order.estado] ?? 'secondary'} className="rounded-full text-xs">{orderStatusLabels[order.estado] ?? order.estado}</Badge></TableCell>
                      <TableCell className="text-gray-500 text-sm">{formatDate(order.fecha)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCopCentavos(order.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-gray-100 shadow-sm">
          <CardHeader className="border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div><CardTitle className="text-base">Alertas de Inventario</CardTitle><p className="text-xs text-gray-500 mt-0.5">Productos con bajo stock o agotados</p></div>
              {!isLoading && <Badge variant="secondary" className="rounded-full">{formatNumber((inventory.data?.outOfStock?.length ?? 0) + (inventory.data?.lowStock?.length ?? 0))}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {isLoading ? (
              <div className="space-y-2"><Skeleton className="h-16 w-full rounded-xl" /><Skeleton className="h-16 w-full rounded-xl" /></div>
            ) : (inventory.data?.outOfStock?.length ?? 0) === 0 && (inventory.data?.lowStock?.length ?? 0) === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-gray-400">Sin alertas de stock</div>
            ) : (
              <>
                {inventory.data?.outOfStock?.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-red-700">{product.nombre}</p>
                      <p className="text-xs text-red-500">{product.sku ?? 'Sin SKU'} · Agotado</p>
                    </div>
                    <Badge variant="destructive" className="rounded-full">0</Badge>
                  </div>
                ))}
                {inventory.data?.lowStock?.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-amber-800">{product.nombre}</p>
                      <p className="text-xs text-amber-600">{product.sku ?? 'Sin SKU'} · Mín: {product.stockMinimo}</p>
                    </div>
                    <Badge variant="secondary" className="rounded-full">{product.stock}</Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
