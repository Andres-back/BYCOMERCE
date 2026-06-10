'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle, AlertTriangle, RefreshCw, ArrowUpCircle, Ban, Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCopCentavos, formatDate, paymentMethodLabels } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth-store';
import { planService } from '@/services/plans/plans.service';
import type { PlanItem, SubscriptionInfo, PaymentItem } from '@/services/plans/plans.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';

const paymentSchema = z.object({
  metodo: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'MIXTO', 'CONTRA_ENTREGA']),
  monto: z.number().min(1, 'Debe ser mayor a 0'),
  comprobanteUrl: z.string().optional(),
  observaciones: z.string().optional(),
  referenciaExterna: z.string().optional(),
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

function statusBadge(estado: string) {
  const map: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; label: string }> = {
    ACTIVO: { variant: 'default', label: 'Activo' },
    TRIAL: { variant: 'secondary', label: 'Prueba' },
    CANCELADO: { variant: 'destructive', label: 'Cancelado' },
    VENCIDO: { variant: 'destructive', label: 'Vencido' },
    SUSPENDIDO: { variant: 'destructive', label: 'Suspendido' },
  };
  const config = map[estado] ?? { variant: 'outline' as const, label: estado };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const isHigh = pct >= 90;
  const isMed = pct >= 70 && pct < 90;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums', isHigh && 'text-destructive', isMed && 'text-amber-500')}>
          {used}/{max} ({Math.round(pct)}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', isHigh ? 'bg-destructive' : isMed ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function PlansClient() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();

  const [changeOpen, setChangeOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [changeMotivo, setChangeMotivo] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const plansQuery = useQuery({
    queryKey: queryKeys.plans.all,
    queryFn: () => planService.list(),
  });

  const subQuery = useQuery({
    queryKey: queryKeys.tenant.subscription,
    queryFn: () => planService.subscription(token!),
    enabled: !!token,
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.tenant.payments,
    queryFn: () => planService.payments(token!),
    enabled: !!token,
  });

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { metodo: 'EFECTIVO', monto: 0, comprobanteUrl: '', observaciones: '', referenciaExterna: '' },
  });

  const paymentMutation = useMutation({
    mutationFn: (data: PaymentFormValues) => planService.registerPayment(token!, { ...data, comprobanteUrl: data.comprobanteUrl || undefined, observaciones: data.observaciones || undefined, referenciaExterna: data.referenciaExterna || undefined }),
    onSuccess: () => { toast.success('Pago registrado'); paymentForm.reset(); setPaymentDialogOpen(false); qc.invalidateQueries({ queryKey: queryKeys.tenant.payments }); qc.invalidateQueries({ queryKey: queryKeys.tenant.subscription }); },
    onError: () => toast.error('Error al registrar pago'),
  });

  const changePlanMutation = useMutation({
    mutationFn: () => planService.changePlan(token!, selectedPlanId, changeMotivo || undefined),
    onSuccess: () => { toast.success('Plan cambiado'); setChangeOpen(false); qc.invalidateQueries({ queryKey: queryKeys.tenant.subscription }); },
    onError: () => toast.error('Error al cambiar plan'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => planService.cancelSubscription(token!, changeMotivo || undefined),
    onSuccess: () => { toast.success('Suscripción cancelada'); setCancelOpen(false); qc.invalidateQueries({ queryKey: queryKeys.tenant.subscription }); },
    onError: () => toast.error('Error al cancelar suscripción'),
  });

  const subscription = subQuery.data;
  const plans = plansQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const loading = plansQuery.isLoading || subQuery.isLoading;

  function checkWarnings(plan: PlanItem) {
    if (!subscription?.uso) return [];
    const warnings: string[] = [];
    if (subscription.uso.productos > plan.limiteProductos) warnings.push(`Productos: ${subscription.uso.productos} > ${plan.limiteProductos}`);
    if (subscription.uso.usuarios > plan.limiteUsuarios) warnings.push(`Usuarios: ${subscription.uso.usuarios} > ${plan.limiteUsuarios}`);
    if (subscription.uso.pedidosMes > plan.limitePedidos) warnings.push(`Pedidos: ${subscription.uso.pedidosMes} > ${plan.limitePedidos}`);
    return warnings;
  }

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Planes y suscripción" description="Gestiona tu plan, límites y pagos de suscripción.">
        <Button variant="outline" size="icon" onClick={() => { plansQuery.refetch(); subQuery.refetch(); paymentsQuery.refetch(); }} disabled={loading} title="Actualizar"><RefreshCw className={cn('size-4', loading && 'animate-spin')} /></Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap">
            <div>
              <CardTitle>Suscripción actual</CardTitle>
              <CardDescription>Estado y uso de tu plan</CardDescription>
            </div>
            {subscription && statusBadge(subscription.estado)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-5 w-48" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : subscription ? (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Plan: </span><span className="font-semibold">{subscription.plan?.nombre ?? '—'}</span></div>
                <div><span className="text-muted-foreground">Inicio: </span><span>{formatDate(subscription.fechaInicio)}</span></div>
                {subscription.fechaFin && <div><span className="text-muted-foreground">Fin: </span><span>{formatDate(subscription.fechaFin)}</span></div>}
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Uso vs. Límites</h4>
                {subscription.uso && subscription.limites ? (
                  <>
                    <UsageBar used={subscription.uso.productos} max={subscription.limites.productos} label="Productos" />
                    <UsageBar used={subscription.uso.usuarios} max={subscription.limites.usuarios} label="Usuarios" />
                    <UsageBar used={subscription.uso.pedidosMes} max={subscription.limites.pedidosMes} label="Pedidos del mes" />
                  </>
                ) : <p className="text-sm text-muted-foreground">Sin datos de uso disponibles.</p>}
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground text-center py-4">No tienes una suscripción activa.</p>}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-bold">Planes disponibles</h2>
        {plansQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-48" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-8 w-24" /><Skeleton className="h-px w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>)}</div>
        ) : (
          <StaggerList><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = subscription?.plan?.id === plan.id;
              const warnings = checkWarnings(plan);
              return (
                <Card key={plan.id} className={cn(isCurrent && 'ring-2 ring-primary')}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div><CardTitle>{plan.nombre}</CardTitle>{plan.descripcion && <CardDescription>{plan.descripcion}</CardDescription>}</div>
                      {isCurrent && <Badge>Actual</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-2xl font-bold">{formatCopCentavos(plan.precio)}</span>
                      <span className="text-sm text-muted-foreground"> /{plan.periodicidad ?? 'mes'}</span>
                    </div>
                    <Separator />
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Productos</span><span className="font-medium">Hasta {plan.limiteProductos}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Usuarios</span><span className="font-medium">Hasta {plan.limiteUsuarios}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Pedidos/mes</span><span className="font-medium">Hasta {plan.limitePedidos}</span></div>
                    </div>
                    {plan.caracteristicas.length > 0 && (
                      <>
                        <Separator />
                        <ul className="space-y-1 text-sm">
                          {plan.caracteristicas.map((f, i) => <li key={i} className="flex items-start gap-2"><CheckCircle className="mt-0.5 size-3.5 shrink-0 text-green-600" /><span>{f}</span></li>)}
                        </ul>
                      </>
                    )}
                    {warnings.length > 0 && (
                      <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                        <AlertTriangle className="mr-1 inline size-3" /> Al cambiar excederías: {warnings.join(', ')}
                      </div>
                    )}
                    {!isCurrent && (
                      <Button variant="outline" className="w-full" disabled={!plan.activo} onClick={() => { setSelectedPlanId(plan.id); setChangeMotivo(''); setChangeOpen(true); }}>
                        <ArrowUpCircle className="size-4" /> Cambiar a {plan.nombre}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div></StaggerList>
        )}
      </div>

      {subscription && subscription.estado === 'ACTIVO' && (
        <Card>
          <CardHeader><CardTitle>Acciones</CardTitle><CardDescription>Administra tu suscripción activa</CardDescription></CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => { setChangeMotivo(''); setCancelOpen(true); }}><Ban className="size-4 mr-1" /> Cancelar suscripción</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Historial de pagos</TabsTrigger>
          <TabsTrigger value="register">Registrar pago</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Historial de pagos</CardTitle></CardHeader>
            <CardContent>
              {paymentsQuery.isLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay pagos registrados.</p>
              ) : (
                <div className="divide-y">
                  {payments.map((p: PaymentItem) => (
                    <div key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatCopCentavos(p.monto)}</span>
                          <Badge variant="secondary" className="text-xs">{paymentMethodLabels[p.metodo] ?? p.metodo}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(p.createdAt)}{p.referenciaExterna && ` · Ref: ${p.referenciaExterna}`}</p>
                      </div>
                      <Badge variant={p.estado === 'APROBADO' || p.estado === 'APPROVED' ? 'default' : 'secondary'}>{p.estado}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Registrar pago</CardTitle><CardDescription>Sube el comprobante de tu pago</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={paymentForm.handleSubmit((data) => paymentMutation.mutate(data))} className="space-y-4">
                <div className="space-y-1">
                  <Label>Método de pago</Label>
                  <Select value={paymentForm.watch('metodo')} onValueChange={(v) => { if (v !== null) paymentForm.setValue('metodo', v as PaymentFormValues['metodo'], { shouldValidate: true }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentMethodLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Monto (COP)</Label>
                  <Input type="number" min={1} step={100} {...paymentForm.register('monto', { valueAsNumber: true })} />
                  {paymentForm.formState.errors.monto && <p className="text-xs text-destructive">{paymentForm.formState.errors.monto.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>URL comprobante</Label>
                  <Input placeholder="https://..." {...paymentForm.register('comprobanteUrl')} />
                </div>
                <div className="space-y-1">
                  <Label>Referencia externa</Label>
                  <Input placeholder="Ej: #12345" {...paymentForm.register('referenciaExterna')} />
                </div>
                <div className="space-y-1">
                  <Label>Observaciones</Label>
                  <Input {...paymentForm.register('observaciones')} />
                </div>
                <Button type="submit" className="w-full" disabled={paymentMutation.isPending}>
                  <Upload className="size-4 mr-1" /> {paymentMutation.isPending ? 'Registrando...' : 'Registrar pago'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar de plan</DialogTitle>
            <DialogDescription>Confirma el cambio al plan seleccionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Plan seleccionado: </span>
              <span className="font-medium">{plans.find((p) => p.id === selectedPlanId)?.nombre ?? selectedPlanId}</span>
            </div>
            {(() => {
              const plan = plans.find((p) => p.id === selectedPlanId);
              if (!plan) return null;
              const warnings = checkWarnings(plan);
              return warnings.length > 0 ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mr-1 inline size-4" /><span className="font-medium">Advertencia:</span> Tu uso actual excede los límites del nuevo plan:
                  <ul className="mt-1 list-inside list-disc text-xs">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              ) : null;
            })()}
            <div className="space-y-1">
              <Label htmlFor="changeMotivo">Motivo (opcional)</Label>
              <Input id="changeMotivo" value={changeMotivo} onChange={(e) => setChangeMotivo(e.target.value)} placeholder="Razón del cambio..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeOpen(false)}>Cancelar</Button>
            <Button onClick={() => changePlanMutation.mutate()} disabled={changePlanMutation.isPending || !selectedPlanId}>
              {changePlanMutation.isPending ? 'Cambiando...' : 'Confirmar cambio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar suscripción"
        description="¿Estás seguro? Al cancelar perderás acceso a las funcionalidades de tu plan al finalizar el periodo actual."
        variant="destructive"
        confirmLabel="Cancelar suscripción"
        onConfirm={() => cancelMutation.mutate()}
      />
    </FadeIn>
  );
}