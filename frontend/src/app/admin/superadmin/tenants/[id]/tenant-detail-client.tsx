'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, ArrowLeft, Ban, CheckCircle, XCircle, RefreshCw, UserPlus,
  ShieldOff, ShieldCheck, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { superadminService } from '@/services/superadmin/superadmin.service';
import { formatCopCentavos, formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';

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

const ROLES = ['ADMIN_NEGOCIO', 'SUPERVISOR', 'CAJERO', 'DOMICILIARIO'] as const;

const userSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(160),
  email: z.string().min(1, 'Requerido').email('Email invalido').max(180),
  rol: z.enum(ROLES),
  password: z.string().min(6, 'Minimo 6 caracteres').max(100).optional().or(z.literal('')),
});
type UserForm = z.infer<typeof userSchema>;

export default function TenantDetailClient() {
  const params = useParams();
  const id = params.id as string;
  const { token } = useAuth();
  const qc = useQueryClient();

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [userCredentials, setUserCredentials] = useState<{ user: { nombre: string; email: string; rol: string }; password: string } | null>(null);

  const detailQuery = useQuery({
    queryKey: ['superadmin', 'tenant', id],
    queryFn: () => superadminService.getTenantDetail(token!, id),
    enabled: !!token && !!id,
  });

  const productsQuery = useQuery({
    queryKey: ['superadmin', 'tenant', id, 'products'],
    queryFn: () => superadminService.getTenantProducts(token!, id),
    enabled: !!token && !!id,
  });

  const ordersQuery = useQuery({
    queryKey: ['superadmin', 'tenant', id, 'orders'],
    queryFn: () => superadminService.getTenantOrders(token!, id),
    enabled: !!token && !!id,
  });

  const salesQuery = useQuery({
    queryKey: ['superadmin', 'tenant', id, 'sales'],
    queryFn: () => superadminService.getTenantSales(token!, id),
    enabled: !!token && !!id,
  });

  const suspendMut = useMutation({
    mutationFn: () => superadminService.suspendTenant(token!, id),
    onSuccess: () => { toast.success('Tenant suspendido'); qc.invalidateQueries({ queryKey: ['superadmin', 'tenant', id] }); },
    onError: (err: Error) => toast.error(err.message || 'Error al suspender'),
  });

  const reactivateMut = useMutation({
    mutationFn: () => superadminService.reactivateTenant(token!, id),
    onSuccess: () => { toast.success('Tenant reactivado'); qc.invalidateQueries({ queryKey: ['superadmin', 'tenant', id] }); },
    onError: (err: Error) => toast.error(err.message || 'Error al reactivar'),
  });

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { nombre: '', email: '', rol: 'CAJERO', password: '' },
  });

  const createUserMut = useMutation({
    mutationFn: (data: UserForm) => {
      return superadminService.createUserForTenant(token!, id, {
        nombre: data.nombre,
        email: data.email,
        rol: data.rol,
        password: data.password || undefined,
      });
    },
    onSuccess: (res) => {
      toast.success('Usuario creado con exito');
      setUserCredentials(res);
      setCreateUserOpen(false);
      userForm.reset();
      qc.invalidateQueries({ queryKey: ['superadmin', 'tenant', id] });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al crear usuario';
      toast.error(msg || 'Error al crear usuario');
    },
  });

  const detail = detailQuery.data;
  const tenant = detail?.tenant;
  const payments = detail?.payments ?? [];
  const products = productsQuery.data?.data ?? [];
  const orders = ordersQuery.data?.data ?? [];
  const sales = salesQuery.data?.data ?? [];
  const subscription = tenant?.subscriptions?.[0];

  function calcDaysRemaining(fechaFin: string): { remaining: number; total: number; pct: number } {
    const end = new Date(fechaFin);
    const start = subscription?.fechaInicio ? new Date(subscription.fechaInicio) : new Date(end.getTime() - 30 * 86400000);
    const now = new Date();
    const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
    const remaining = Math.max(0, Math.round((end.getTime() - now.getTime()) / 86400000));
    const pct = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
    return { remaining, total, pct };
  }

  const daysInfo = subscription?.fechaFin ? calcDaysRemaining(subscription.fechaFin) : null;

  function handleCreateUser(data: UserForm) {
    createUserMut.mutate(data);
  }

  const isLoading = detailQuery.isLoading;

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader
        title={isLoading ? 'Cargando...' : (tenant?.nombre ?? 'Tenant')}
        description={tenant?.slug ?? 'Detalle del tenant'}
      >
        <div className="flex items-center gap-2">
          <Link href="/admin/superadmin/tenants">
            <Button variant="outline" size="sm"><ArrowLeft className="size-4 mr-1" /> Volver</Button>
          </Link>
          {tenant?.estado === 'ACTIVO' || tenant?.estado === 'PENDIENTE' ? (
            <Button variant="destructive" size="sm" onClick={() => setSuspendOpen(true)} disabled={suspendMut.isPending}>
              <Ban className="size-4 mr-1" /> Suspender
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={() => setReactivateOpen(true)} disabled={reactivateMut.isPending}>
              <CheckCircle className="size-4 mr-1" /> Reactivar
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => { detailQuery.refetch(); productsQuery.refetch(); ordersQuery.refetch(); salesQuery.refetch(); }} disabled={isLoading} title="Actualizar">
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !tenant ? (
        <EmptyState title="Tenant no encontrado" description="El tenant solicitado no existe o fue eliminado." />
      ) : (
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Informacion</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="sales">Ventas</TabsTrigger>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Datos del negocio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nombre</p>
                      <p className="font-medium">{tenant.nombre}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Slug</p>
                      <p className="font-medium">{tenant.slug}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo negocio</p>
                      <p className="font-medium">{tenant.tipoNegocio}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ciudad</p>
                      <p className="font-medium">{tenant.ciudad}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estado</p>
                      <Badge variant={ESTADO_BADGE[tenant.estado] ?? 'outline'}>{ESTADO_LABEL[tenant.estado] ?? tenant.estado}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{tenant.email ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Telefono</p>
                      <p className="font-medium">{tenant.telefono ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Direccion</p>
                      <p className="font-medium">{tenant.direccion ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Barrio</p>
                      <p className="font-medium">{tenant.barrio ?? '—'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Suscripcion desde</p>
                      <p className="font-medium">{subscription ? formatDate(subscription.fechaInicio) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ID</p>
                      <p className="font-mono text-xs text-muted-foreground break-all">{tenant.id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                {tenant.plan && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Plan actual</CardTitle>
                      <CardDescription>{tenant.plan.nombre}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold">{formatCopCentavos(tenant.plan.precio)}</span>
                        <span className="text-sm text-muted-foreground">/mes</span>
                      </div>
                      <Separator />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Limite usuarios</span>
                          <span className="font-medium">{tenant.plan.limiteUsuarios}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Limite productos</span>
                          <span className="font-medium">{tenant.plan.limiteProductos}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Usuarios actuales</span>
                          <span className="font-medium">{tenant._count?.users ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Productos actuales</span>
                          <span className="font-medium">{tenant._count?.products ?? 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {subscription && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Suscripcion</CardTitle>
                      <CardDescription>Estado: {subscription.estado}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Inicio</p>
                          <p className="font-medium">{formatDate(subscription.fechaInicio)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fin</p>
                          <p className="font-medium">{formatDate(subscription.fechaFin)}</p>
                        </div>
                      </div>
                      {daysInfo && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progreso</span>
                            <span className="font-medium">{daysInfo.remaining} dias restantes</span>
                          </div>
                          <Progress value={daysInfo.pct} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Usuarios del tenant</CardTitle>
                  <Button size="sm" onClick={() => { userForm.reset({ nombre: '', email: '', rol: 'CAJERO', password: '' }); setCreateUserOpen(true); }}>
                    <UserPlus className="size-4 mr-1" /> Crear Usuario
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {detailQuery.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : (tenant as unknown as { users?: Array<{ id: string; nombre: string; email: string; rol: string; estado: string }> }).users?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(tenant as unknown as { users: Array<{ id: string; nombre: string; email: string; rol: string; estado: string }> }).users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.nombre}</TableCell>
                          <TableCell className="text-muted-foreground">{u.email}</TableCell>
                          <TableCell>{u.rol}</TableCell>
                          <TableCell><Badge variant={u.estado === 'ACTIVO' ? 'default' : 'secondary'}>{u.estado}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState title="Sin usuarios" description="Este tenant no tiene usuarios registrados." />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Productos</CardTitle></CardHeader>
              <CardContent>
                {productsQuery.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : products.length === 0 ? (
                  <EmptyState title="Sin productos" description="Este tenant no tiene productos registrados." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(products as Array<{ id: string; nombre: string; sku?: string | null; precio: number; stock: number; estado?: string }>).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nombre}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.sku ?? '—'}</TableCell>
                          <TableCell className="text-right">{formatCopCentavos(p.precio)}</TableCell>
                          <TableCell className="text-right">{formatNumber(p.stock)}</TableCell>
                          <TableCell><Badge variant={p.estado === 'ACTIVO' ? 'default' : 'secondary'}>{p.estado ?? 'ACTIVO'}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Pedidos</CardTitle></CardHeader>
              <CardContent>
                {ordersQuery.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : orders.length === 0 ? (
                  <EmptyState title="Sin pedidos" description="Este tenant no tiene pedidos." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(orders as Array<{ id: string; total: number; estado: string; fecha: string }>).map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-right">{formatCopCentavos(o.total)}</TableCell>
                          <TableCell><Badge variant="secondary">{o.estado}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(o.fecha)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Ventas</CardTitle></CardHeader>
              <CardContent>
                {salesQuery.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : sales.length === 0 ? (
                  <EmptyState title="Sin ventas" description="Este tenant no tiene ventas registradas." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Metodo pago</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sales as Array<{ id: string; total: number; metodoPago: string; fecha: string }>).map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">{s.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-right">{formatCopCentavos(s.total)}</TableCell>
                          <TableCell className="text-muted-foreground">{s.metodoPago}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(s.fecha)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Historial de pagos</CardTitle></CardHeader>
              <CardContent>
                {detailQuery.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : payments.length === 0 ? (
                  <EmptyState title="Sin pagos" description="Este tenant no tiene pagos registrados." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Metodo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-right font-medium">{formatCopCentavos(p.monto)}</TableCell>
                          <TableCell className="text-muted-foreground">{p.metodo}</TableCell>
                          <TableCell>
                            <Badge variant={p.estado === 'APROBADO' || p.estado === 'APPROVED' ? 'default' : p.estado === 'PENDIENTE' ? 'secondary' : 'destructive'}>
                              {p.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={createUserOpen} onOpenChange={(open) => { if (!open) setCreateUserOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Usuario</DialogTitle>
            <DialogDescription>Nuevo usuario para este tenant.</DialogDescription>
          </DialogHeader>
          <form onSubmit={userForm.handleSubmit(handleCreateUser)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="u-nombre">Nombre</Label>
              <Input id="u-nombre" {...userForm.register('nombre')} />
              {userForm.formState.errors.nombre && <p className="text-xs text-destructive">{userForm.formState.errors.nombre.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" {...userForm.register('email')} />
              {userForm.formState.errors.email && <p className="text-xs text-destructive">{userForm.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-rol">Rol</Label>
              <Select value={userForm.watch('rol')} onValueChange={(v) => { if (v !== null) userForm.setValue('rol', v as UserForm['rol'], { shouldValidate: true }); }}>
                <SelectTrigger id="u-rol"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {userForm.formState.errors.rol && <p className="text-xs text-destructive">{userForm.formState.errors.rol.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-password">Contrasena (opcional)</Label>
              <Input id="u-password" type="password" {...userForm.register('password')} placeholder="Se generara automaticamente si se deja vacio" />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={createUserMut.isPending}>
                {createUserMut.isPending ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userCredentials} onOpenChange={(open) => { if (!open) setUserCredentials(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuario creado</DialogTitle>
            <DialogDescription>Credenciales del nuevo usuario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">USUARIO</p>
              <p className="text-sm font-medium">{userCredentials?.user.nombre}</p>
              <p className="text-xs text-muted-foreground">Email: {userCredentials?.user.email}</p>
              <p className="text-xs text-muted-foreground">Rol: {userCredentials?.user.rol}</p>
            </div>
            {userCredentials?.password && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Contrasena temporal</p>
                <p className="mt-1 font-mono text-sm font-bold tracking-wider text-amber-800 dark:text-amber-300 select-all">
                  {userCredentials.password}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setUserCredentials(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        title="Suspender Tenant"
        description={`Suspender a "${tenant?.nombre}"? El negocio y sus usuarios no podran acceder al sistema.`}
        variant="destructive"
        confirmLabel="Suspender"
        onConfirm={() => suspendMut.mutate(undefined, { onSettled: () => setSuspendOpen(false) })}
      />

      <ConfirmDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        title="Reactivar Tenant"
        description={`Reactivar a "${tenant?.nombre}"? El negocio recuperara el acceso al sistema.`}
        confirmLabel="Reactivar"
        onConfirm={() => reactivateMut.mutate(undefined, { onSettled: () => setReactivateOpen(false) })}
      />
    </FadeIn>
  );
}
