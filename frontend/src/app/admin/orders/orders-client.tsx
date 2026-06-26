'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import {
  Ban,
  Bike,
  Check,
  ChefHat,
  Clock,
  PackageCheck,
  RefreshCw,
  Route,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { PageHeader } from '@/components/layouts/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { cn } from '@/lib/utils';
import { formatCopCentavos, formatRelativeTime, orderStatusLabels, orderStatusColors, paymentMethodLabels } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import {
  useOrders,
  useDeliveryUsers,
  useConfirmOrder,
  useRejectOrder,
  useCancelOrder,
  usePreparingOrder,
  useReadyOrder,
  useDispatchOrder,
  useDeliverOrder,
  useAssignDelivery,
} from '@/hooks/use-orders';
import type { Order } from '@/types/api';

const KANBAN_COLUMNS = [
  { key: 'PENDIENTE', label: 'Pendiente', color: 'bg-yellow-100 dark:bg-yellow-950' },
  { key: 'CONFIRMADA', label: 'Confirmada', color: 'bg-blue-50 dark:bg-blue-950' },
  { key: 'EN_PREPARACION', label: 'Preparando', color: 'bg-orange-50 dark:bg-orange-950' },
  { key: 'LISTA', label: 'Lista', color: 'bg-green-50 dark:bg-green-950' },
  { key: 'EN_CAMINO', label: 'En camino', color: 'bg-purple-50 dark:bg-purple-950' },
  { key: 'ENTREGADA', label: 'Entregada', color: 'bg-gray-50 dark:bg-gray-950' },
] as const;

const STATUS_FILTER_OPTIONS = [
  { value: 'TODOS', label: 'Todos' },
  ...Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label })),
];

const ASSIGNABLE_STATUSES = ['CONFIRMADA', 'EN_PREPARACION', 'LISTA', 'EN_CAMINO'];

const motivoSchema = z.object({
  motivo: z.string().min(1, 'Ingresa un motivo').max(500),
});
type MotivoFormValues = z.infer<typeof motivoSchema>;

const deliverSchema = z.object({
  metodoPago: z.enum(['CONTRA_ENTREGA', 'EFECTIVO', 'TRANSFERENCIA', 'TARJETA']),
  montoRecibido: z.number().min(0, 'Debe ser mayor o igual a 0'),
  referenciaExterna: z.string().optional(),
});
type DeliverFormValues = z.infer<typeof deliverSchema>;

function shortId(id: string) {
  return id.slice(-8).toUpperCase();
}

function MotivoDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: (motivo: string) => void;
}) {
  const form = useForm<MotivoFormValues>({
    resolver: zodResolver(motivoSchema) as never,
    defaultValues: { motivo: '' },
  });

  function handleSubmit(data: MotivoFormValues) {
    onConfirm(data.motivo);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) form.reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea id="motivo" placeholder="Describe el motivo..." {...form.register('motivo')} />
            {form.formState.errors.motivo && (
              <p className="text-xs text-destructive">{form.formState.errors.motivo.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { form.reset(); onOpenChange(false); }} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? 'Procesando...' : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const itemsSummary = order.items
    .slice(0, 2)
    .map((item) => `${item.cantidad}x ${item.product?.nombre ?? 'Producto'}`)
    .join(', ');
  const moreCount = order.items.length > 2 ? order.items.length - 2 : 0;

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/40"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">#{shortId(order.id)}</span>
          <Badge variant={orderStatusColors[order.estado] ?? 'secondary'}>
            {orderStatusLabels[order.estado] ?? order.estado}
          </Badge>
        </div>
        <p className="font-medium text-sm truncate">{order.customer?.nombre ?? 'Sin nombre'}</p>
        <p className="font-semibold text-sm">{formatCopCentavos(order.total)}</p>
        {order.items.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">
            {itemsSummary}{moreCount > 0 && ` +${moreCount}`}
          </p>
        )}
        {order.metodoPago && (
          <p className="text-xs text-muted-foreground">
            {paymentMethodLabels[order.metodoPago] ?? order.metodoPago}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{formatRelativeTime(order.fecha)}</p>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  label,
  color,
  orders,
  onSelectOrder,
}: {
  label: string;
  color: string;
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}) {
  return (
    <div className="min-w-[260px] flex-1">
      <div className={cn('flex items-center gap-2 mb-3 rounded-md px-3 py-2', color)}>
        <h3 className="font-semibold text-sm">{label}</h3>
        <Badge variant="secondary" className="text-xs">{orders.length}</Badge>
      </div>
      <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {orders.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Sin pedidos</p>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} onClick={() => onSelectOrder(order)} />
          ))
        )}
      </div>
    </div>
  );
}

export default function OrdersClient() {
  const { token, isAdmin, isSupervisor, role } = useAuth();
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [mobileFilter, setMobileFilter] = useState('TODOS');
  const [motivoTarget, setMotivoTarget] = useState<{ orderId: string; type: 'reject' | 'cancel' } | null>(null);
  const [deliveringOrder, setDeliveringOrder] = useState<Order | null>(null);
  const [assignDeliveryId, setAssignDeliveryId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data: orders = [], isLoading, refetch } = useOrders(token!);
  const { data: deliveryUsers = [] } = useDeliveryUsers(token!);

  const confirmMutation = useConfirmOrder(token!);
  const rejectMutation = useRejectOrder(token!);
  const cancelMutation = useCancelOrder(token!);
  const prepareMutation = usePreparingOrder(token!);
  const readyMutation = useReadyOrder(token!);
  const dispatchMutation = useDispatchOrder(token!);
  const deliverMutation = useDeliverOrder(token!);
  const assignMutation = useAssignDelivery(token!);

  const ordersByStatus = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const order of orders) {
      if (!map[order.estado]) map[order.estado] = [];
      map[order.estado].push(order);
    }
    return map;
  }, [orders]);

  const filteredMobileOrders = useMemo(() => {
    if (mobileFilter === 'TODOS') return orders;
    return orders.filter((o) => o.estado === mobileFilter);
  }, [orders, mobileFilter]);

  const pendingCount = orders.filter((o) => o.estado === 'PENDIENTE').length;
  const activeCount = orders.filter((o) =>
    ['CONFIRMADA', 'EN_PREPARACION', 'LISTA', 'EN_CAMINO'].includes(o.estado),
  ).length;
  const totalAmount = orders.reduce((sum, o) => sum + o.total, 0);
  const preparingCount = orders.filter((o) => o.estado === 'EN_PREPARACION').length;
  const inRouteCount = orders.filter((o) => o.estado === 'EN_CAMINO').length;
  const deliveredTodayCount = orders.filter((o) => {
    if (o.estado !== 'ENTREGADA') return false;
    const d = new Date(o.fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  }).length;
  const canAssignDelivery = isAdmin || isSupervisor;
  const isDeliveryRole = role === 'DOMICILIARIO';

  const archivedOrders = orders.filter((o) => o.estado === 'CANCELADA' || o.estado === 'RECHAZADA');

  function handleAction(action: string, orderId: string) {
    if (action === 'reject' || action === 'cancel') {
      setMotivoTarget({ orderId, type: action as 'reject' | 'cancel' });
      return;
    }
    if (action === 'deliver') {
      const order = orders.find((o) => o.id === orderId);
      if (order) setDeliveringOrder(order);
      return;
    }
    switch (action) {
      case 'confirm': confirmMutation.mutate(orderId); break;
      case 'prepare': prepareMutation.mutate(orderId); break;
      case 'ready': readyMutation.mutate(orderId); break;
      case 'dispatch': dispatchMutation.mutate(orderId); break;
      case 'view-route': router.push('/admin/delivery/route'); break;
    }
  }

  function handleMotivoConfirm(motivo: string) {
    if (!motivoTarget) return;
    if (motivoTarget.type === 'reject') {
      rejectMutation.mutate({ orderId: motivoTarget.orderId, motivo });
    } else {
      cancelMutation.mutate({ orderId: motivoTarget.orderId, motivo });
    }
    setMotivoTarget(null);
  }

  function handleAssignDelivery(orderId: string, deliveryUserId: string) {
    assignMutation.mutate({ orderId, deliveryUserId }, {
      onSuccess: () => setAssignDeliveryId(null),
    });
  }

  return (
    <FadeIn as="main" className="space-y-6">
      <Breadcrumbs />
      <PageHeader
        title={isDeliveryRole ? 'Mis pedidos' : 'Pedidos'}
        description={isDeliveryRole ? 'Pedidos asignados y ruta de entrega para hoy.' : 'Gestiona los pedidos del negocio y actualiza su estado.'}
      >
        {isDeliveryRole && (
          <Button variant="default" onClick={() => router.push('/admin/delivery/route')}>
            <Route className="size-4 mr-1" /> Mi ruta
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={() => refetch()} title="Actualizar">
          <RefreshCw className="size-4" />
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Pendientes hoy" value={pendingCount} icon={Clock} />
        <StatCard title="En preparación" value={preparingCount} icon={ChefHat} />
        <StatCard title="En ruta" value={inRouteCount} icon={Bike} />
        <StatCard title="Entregados hoy" value={deliveredTodayCount} icon={PackageCheck} />
      </div>

      {!isDeliveryRole && <div className="hidden lg:block">
        <StaggerList stagger={0.03}><div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              label={col.label}
              color={col.color}
              orders={ordersByStatus[col.key] ?? []}
              onSelectOrder={(order) => setSelectedOrder(order)}
            />
          ))}
        </div></StaggerList>
        {archivedOrders.length > 0 && (
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? 'Ocultar' : 'Mostrar'} archivados ({archivedOrders.length})
            </Button>
            {showArchived && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {archivedOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>}

      <div className={cn(isDeliveryRole ? 'space-y-4' : 'lg:hidden space-y-4')}>
        <Select value={mobileFilter} onValueChange={(v) => setMobileFilter(v ?? '')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMobileOrders.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No hay pedidos para este filtro.</p>
        ) : (
          <div className="space-y-3">
            {filteredMobileOrders.map((order) => (
              <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open: boolean) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <OrderDetail
              order={selectedOrder}
              deliveryUsers={deliveryUsers}
              canAssignDelivery={canAssignDelivery}
              onAction={handleAction}
              assignDeliveryId={assignDeliveryId}
              onAssignDeliveryIdChange={setAssignDeliveryId}
              onAssignDelivery={handleAssignDelivery}
              isAssignPending={assignMutation.isPending}
              actionPending={
                confirmMutation.isPending || rejectMutation.isPending || cancelMutation.isPending ||
                prepareMutation.isPending || readyMutation.isPending || dispatchMutation.isPending
              }
              onClose={() => setSelectedOrder(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <MotivoDialog
        open={!!motivoTarget}
        onOpenChange={(open) => { if (!open) setMotivoTarget(null); }}
        title={motivoTarget?.type === 'reject' ? 'Rechazar pedido' : 'Cancelar pedido'}
        description={
          motivoTarget?.type === 'reject'
            ? `Rechazar el pedido #${motivoTarget ? shortId(motivoTarget.orderId) : ''}`
            : `Cancelar el pedido #${motivoTarget ? shortId(motivoTarget.orderId) : ''}`
        }
        confirmLabel={motivoTarget?.type === 'reject' ? 'Rechazar' : 'Cancelar pedido'}
        isPending={rejectMutation.isPending || cancelMutation.isPending}
        onConfirm={handleMotivoConfirm}
      />

      <DeliverOrderDialog
        open={!!deliveringOrder}
        onOpenChange={(open) => { if (!open) setDeliveringOrder(null); }}
        order={deliveringOrder}
        isPending={deliverMutation.isPending}
        onSubmit={(data) => {
          if (deliveringOrder) {
            deliverMutation.mutate(
              { orderId: deliveringOrder.id, input: { metodoPago: data.metodoPago, montoRecibido: data.montoRecibido, referenciaExterna: data.referenciaExterna?.trim() || undefined } },
              { onSuccess: () => { setDeliveringOrder(null); setSelectedOrder(null); } },
            );
          }
        }}
      />
    </FadeIn>
  );
}

function DeliverOrderDialog({
  open,
  onOpenChange,
  order,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  isPending: boolean;
  onSubmit: (data: DeliverFormValues) => void;
}) {
  const defaultMethod: DeliverFormValues['metodoPago'] =
    order?.metodoPago === 'MIXTO' || !order?.metodoPago ? 'CONTRA_ENTREGA' : (order.metodoPago as DeliverFormValues['metodoPago']);

  const form = useForm<DeliverFormValues>({
    resolver: zodResolver(deliverSchema) as never,
    defaultValues: {
      metodoPago: defaultMethod,
      montoRecibido: order?.total ?? 0,
      referenciaExterna: '',
    },
    values: order ? { metodoPago: defaultMethod, montoRecibido: order.total, referenciaExterna: '' } : undefined,
  });

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entregar pedido #{shortId(order.id)}</DialogTitle>
          <DialogDescription>Registra el cobro para cerrar el pedido como entregado.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Metodo de pago</Label>
              <Select
                value={form.watch('metodoPago')}
                onValueChange={(v) => { if (v !== null) form.setValue('metodoPago', v as DeliverFormValues['metodoPago']); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTRA_ENTREGA">Contra entrega</SelectItem>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="TARJETA">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Monto recibido</Label>
              <Input type="number" min={0} {...form.register('montoRecibido', { valueAsNumber: true })} />
              {form.formState.errors.montoRecibido && (
                <p className="text-xs text-destructive">{form.formState.errors.montoRecibido.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Referencia</Label>
            <Input {...form.register('referenciaExterna')} placeholder="Opcional" />
          </div>
          <div className="text-sm text-muted-foreground">
            Total del pedido: <strong>{formatCopCentavos(order.total)}</strong>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Procesando...' : 'Entregar y cobrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetail({
  order,
  deliveryUsers,
  canAssignDelivery,
  onAction,
  assignDeliveryId,
  onAssignDeliveryIdChange,
  onAssignDelivery,
  isAssignPending,
  actionPending,
  onClose,
}: {
  order: Order;
  deliveryUsers: { id: string; nombre: string; email: string; rol: string }[];
  canAssignDelivery: boolean;
  onAction: (action: string, orderId: string) => void;
  assignDeliveryId: string | null;
  onAssignDeliveryIdChange: (id: string | null) => void;
  onAssignDelivery: (orderId: string, deliveryUserId: string) => void;
  isAssignPending: boolean;
  actionPending: boolean;
  onClose: () => void;
}) {
  const selectedDeliveryId = assignDeliveryId ?? order.deliveryUserId ?? '';

  const actions: Array<{ label: string; action: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; icon: React.ReactNode }> = [];
  if (order.estado === 'PENDIENTE') {
    actions.push({ label: 'Confirmar', action: 'confirm', variant: 'default', icon: <Check className="size-4" /> });
    actions.push({ label: 'Rechazar', action: 'reject', variant: 'destructive', icon: <X className="size-4" /> });
  }
  if (order.estado === 'CONFIRMADA') {
    actions.push({ label: 'Preparar', action: 'prepare', variant: 'default', icon: <ChefHat className="size-4" /> });
    actions.push({ label: 'Cancelar', action: 'cancel', variant: 'destructive', icon: <Ban className="size-4" /> });
  }
  if (order.estado === 'EN_PREPARACION') {
    actions.push({ label: 'Lista', action: 'ready', variant: 'default', icon: <PackageCheck className="size-4" /> });
    actions.push({ label: 'Cancelar', action: 'cancel', variant: 'destructive', icon: <Ban className="size-4" /> });
  }
  if (order.estado === 'LISTA') {
    actions.push({ label: 'Despachar', action: 'dispatch', variant: 'default', icon: <Bike className="size-4" /> });
    actions.push({ label: 'Cancelar', action: 'cancel', variant: 'destructive', icon: <Ban className="size-4" /> });
  }
  if (order.estado === 'EN_CAMINO') {
    actions.push({ label: 'Entregar', action: 'deliver', variant: 'default', icon: <Check className="size-4" /> });
    actions.push({ label: 'Ver ruta', action: 'view-route', variant: 'outline', icon: <Route className="size-4" /> });
    actions.push({ label: 'Cancelar', action: 'cancel', variant: 'destructive', icon: <Ban className="size-4" /> });
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <DialogTitle>Pedido #{shortId(order.id)}</DialogTitle>
            <DialogDescription>{formatRelativeTime(order.fecha)}</DialogDescription>
          </div>
          <Badge variant={orderStatusColors[order.estado] ?? 'secondary'} className="text-xs">
            {orderStatusLabels[order.estado] ?? order.estado}
          </Badge>
        </div>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh] pr-2">
        <div className="space-y-4 pb-4">
          {order.customer && (
            <div className="rounded-lg border p-3 space-y-1">
              <h4 className="font-medium text-sm">Cliente</h4>
              <p className="text-sm">{order.customer.nombre}</p>
              <p className="text-xs text-muted-foreground">{order.customer.telefono}</p>
              {order.customer.email && <p className="text-xs text-muted-foreground">{order.customer.email}</p>}
            </div>
          )}

          <div className="rounded-lg border p-3 space-y-1">
            <h4 className="font-medium text-sm">Entrega</h4>
            <p className="text-sm">{order.direccion}</p>
            {order.metodoPago && (
              <p className="text-xs text-muted-foreground">
                Pago: {paymentMethodLabels[order.metodoPago] ?? order.metodoPago}
              </p>
            )}
            {order.deliveryUser && (
              <p className="text-xs text-muted-foreground">
                Domiciliario: {order.deliveryUser.nombre}
              </p>
            )}
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <h4 className="font-medium text-sm">Productos</h4>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <span className="truncate">{item.product?.nombre ?? 'Producto'}</span>
                  <span className="text-muted-foreground ml-1">x{item.cantidad}</span>
                </div>
                <span className="font-medium ml-2">{formatCopCentavos(item.subtotal)}</span>
              </div>
            ))}
            <div className="border-t pt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCopCentavos(order.subtotal)}</span>
              </div>
              {order.costoDomicilio > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Domicilio</span>
                  <span>{formatCopCentavos(order.costoDomicilio)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCopCentavos(order.total)}</span>
              </div>
            </div>
          </div>

          {order.observaciones && (
            <div className="rounded-lg border p-3">
              <h4 className="font-medium text-sm mb-1">Observaciones</h4>
              <p className="text-sm text-muted-foreground">{order.observaciones}</p>
            </div>
          )}

          {canAssignDelivery && ASSIGNABLE_STATUSES.includes(order.estado) && (
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="font-medium text-sm">Asignar domiciliario</h4>
              {order.deliveryUser && (
                <p className="text-xs text-muted-foreground">
                  Actual: {order.deliveryUser.nombre}
                </p>
              )}
              <div className="flex gap-2">
                <Select
                  value={selectedDeliveryId || undefined}
                  onValueChange={(v) => onAssignDeliveryIdChange(v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar domiciliario" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!selectedDeliveryId || isAssignPending}
                  onClick={() => {
                    if (selectedDeliveryId) onAssignDelivery(order.id, selectedDeliveryId);
                  }}
                >
                  Asignar
                </Button>
              </div>
            </div>
          )}

          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <Button
                  key={a.action}
                  variant={a.variant}
                  size="sm"
                  disabled={actionPending}
                  onClick={() => onAction(a.action, order.id)}
                >
                  {a.icon} {a.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}
