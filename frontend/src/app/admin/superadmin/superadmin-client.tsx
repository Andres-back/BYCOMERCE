'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import {
  Building2, Users, Package, DollarSign, ShoppingCart, CreditCard,
  AlertTriangle, Shield, LayoutGrid, FileText, RefreshCw, CheckCircle, XCircle,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { superadminService } from '@/services/superadmin/superadmin.service';
import { formatCopCentavos, formatNumber, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/layouts/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

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

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium">{formatNumber(payload[0].value)}</p>
    </div>
  );
}

export default function SuperadminClient() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null);
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ['superadmin', 'stats'],
    queryFn: () => superadminService.stats(token!),
    enabled: !!token,
  });

  const tenantsQuery = useQuery({
    queryKey: ['superadmin', 'tenants', 'recent'],
    queryFn: () => superadminService.listTenants(token!, { page: 1, pageSize: 5 }),
    enabled: !!token,
  });

  const paymentsQuery = useQuery({
    queryKey: ['superadmin', 'payments'],
    queryFn: () => superadminService.payments(token!),
    enabled: !!token,
  });

  const confirmPayment = useMutation({
    mutationFn: (id: string) => superadminService.confirmPayment(token!, id),
    onSuccess: () => { toast.success('Pago confirmado'); qc.invalidateQueries({ queryKey: ['superadmin', 'payments'] }); },
    onError: () => toast.error('Error al confirmar pago'),
  });

  const rejectPayment = useMutation({
    mutationFn: (id: string) => superadminService.rejectPayment(token!, id, 'Rechazado por superadmin'),
    onSuccess: () => { toast.success('Pago rechazado'); qc.invalidateQueries({ queryKey: ['superadmin', 'payments'] }); },
    onError: () => toast.error('Error al rechazar pago'),
  });

  function handleConfirmPayment() {
    if (!confirmPaymentId) return;
    confirmPayment.mutate(confirmPaymentId);
    setConfirmPaymentId(null);
  }

  function handleRejectPayment() {
    if (!rejectPaymentId) return;
    rejectPayment.mutate(rejectPaymentId);
    setRejectPaymentId(null);
  }

  const stats = statsQuery.data;
  const recentTenants = tenantsQuery.data?.data ?? [];
  const payments = paymentsQuery.data?.data ?? [];
  const isLoading = statsQuery.isLoading || tenantsQuery.isLoading;

  const chartData = [
    { name: 'Ene', tenants: 4, users: 18 },
    { name: 'Feb', tenants: 7, users: 35 },
    { name: 'Mar', tenants: 9, users: 52 },
    { name: 'Abr', tenants: 14, users: 78 },
    { name: 'May', tenants: stats?.totalTenants ?? 18, users: stats?.totalUsers ?? 95 },
  ];

  const kpiCards = [
    { title: 'Total Tenants', value: formatNumber(stats?.totalTenants ?? 0), icon: Building2 },
    { title: 'Activos', value: formatNumber(stats?.tenantsActivos ?? 0), icon: Shield },
    { title: 'Usuarios', value: formatNumber(stats?.totalUsers ?? 0), icon: Users },
    { title: 'Productos', value: formatNumber(stats?.totalProducts ?? 0), icon: Package },
    { title: 'Ventas', value: formatNumber(stats?.totalSales ?? 0), icon: TrendingUp },
    { title: 'Pedidos', value: formatNumber(stats?.totalOrders ?? 0), icon: ShoppingCart },
    { title: 'Pagos Pendientes', value: formatNumber(stats?.pendingPayments ?? 0), icon: AlertTriangle },
    { title: 'Monto Pendiente', value: formatCopCentavos(stats?.pendingPaymentsMonto ?? 0), icon: DollarSign },
  ];

  const quickActions = [
    { title: 'Crear Tenant', description: 'Registrar nuevo negocio', icon: Building2, href: '/admin/superadmin/tenants' },
    { title: 'Gestionar Planes', description: 'Administrar planes de suscripcion', icon: LayoutGrid, href: '/admin/superadmin/plans' },
    { title: 'Revisar Pagos', description: `${stats?.pendingPayments ?? 0} pagos pendientes`, icon: DollarSign, href: '/admin/superadmin/tenants' },
    { title: 'Auditoria', description: 'Logs de actividad del sistema', icon: FileText, href: '/admin/superadmin/audit' },
  ];

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Panel de Control" description="Administracion del sistema multi-tenant">
        <Button variant="outline" size="icon" onClick={() => { statsQuery.refetch(); tenantsQuery.refetch(); paymentsQuery.refetch(); }} disabled={isLoading} title="Actualizar">
          <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="mb-2 h-4 w-20" />
                  <Skeleton className="h-6 w-28" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((kpi) => (
              <StatCard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href}>
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <action.icon className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Crecimiento del Sistema</CardTitle>
            <CardDescription>Proyeccion de tenants y usuarios</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="tenants" name="Tenants" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="users" name="Usuarios" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tenants Recientes</CardTitle>
                <CardDescription>Ultimos negocios registrados</CardDescription>
              </div>
              <Link href="/admin/superadmin/tenants">
                <Button variant="outline" size="sm">Ver todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : recentTenants.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No hay tenants registrados.</p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Creado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/superadmin/tenants/${t.id}`} className="hover:underline">{t.nombre}</Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.plan?.nombre ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={ESTADO_BADGE[t.estado] ?? 'outline'}>{ESTADO_LABEL[t.estado] ?? t.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <CardTitle>Pagos Pendientes</CardTitle>
          <CardDescription>Ultimos pagos por confirmar o rechazar</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsQuery.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay pagos pendientes.</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 10).map((p: unknown) => {
                  const payment = p as { id: string; monto: number; metodo: string; estado: string; createdAt: string; tenant?: { nombre: string } };
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.tenant?.nombre ?? '—'}</TableCell>
                      <TableCell>{formatCopCentavos(payment.monto)}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.metodo}</TableCell>
                      <TableCell>
                        <Badge variant={payment.estado === 'PENDIENTE' ? 'secondary' : payment.estado === 'APROBADO' ? 'default' : 'destructive'}>
                          {payment.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(payment.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {payment.estado === 'PENDIENTE' && (
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button size="icon-xs" variant="ghost" onClick={() => setConfirmPaymentId(payment.id)} title="Confirmar">
                              <CheckCircle className="size-3 text-emerald-600" />
                            </Button>
                            <Button size="icon-xs" variant="ghost" onClick={() => setRejectPaymentId(payment.id)} title="Rechazar">
                              <XCircle className="size-3 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmPaymentId} onOpenChange={(open) => { if (!open) setConfirmPaymentId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pago</DialogTitle>
            <DialogDescription>¿Confirmar este pago? Esta accion no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPaymentId(null)}>Cancelar</Button>
            <Button onClick={handleConfirmPayment} disabled={confirmPayment.isPending}>
              {confirmPayment.isPending ? 'Confirmando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectPaymentId} onOpenChange={(open) => { if (!open) setRejectPaymentId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar pago</DialogTitle>
            <DialogDescription>¿Rechazar este pago? El tenant sera notificado.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectPaymentId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejectPayment} disabled={rejectPayment.isPending}>
              {rejectPayment.isPending ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </FadeIn>
  );
}
