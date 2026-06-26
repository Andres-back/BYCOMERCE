'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  Banknote, PlusCircle, RefreshCw, WalletCards, Pencil, Trash2, UploadCloud, Camera, Bot, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { formatCopCentavos, formatDateTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import {
  useCurrentCashRegister,
  useCashRegisters,
  useOpenCashRegister,
  useCloseCashRegister,
  useCreateCashMovement,
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useExtractExpenseReceipt,
} from '@/hooks/use-finance';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiEnvelope } from '@/types/api';
import { csrfHeaders } from '@/services/api/client';
import type { ColumnDef } from '@tanstack/react-table';
import type { Expense } from '@/types/api';

interface UploadResponse {
  key: string;
  url: string;
  size: number;
  mimetype: string;
  originalName?: string;
}

interface ExpenseReceiptState {
  url: string;
  name?: string;
  mime?: string;
  iaText?: string;
  iaJson?: Record<string, unknown>;
}

const movementLabels: Record<string, string> = {
  VENTA: 'Venta',
  GASTO: 'Gasto',
  INGRESO_MANUAL: 'Ingreso manual',
  AJUSTE: 'Ajuste',
  RETIRO: 'Retiro',
  DEVOLUCION: 'Devolución',
  APERTURA: 'Apertura',
  CIERRE: 'Cierre',
};

const expenseCategoryOptions = [
  'Alquiler', 'Servicios', 'Nomina', 'Transporte', 'Mantenimiento', 'Suministros', 'Marketing', 'Otros',
];

const openSchema = z.object({
  saldoInicial: z.number({ message: 'Requerido' }).gte(0, 'Debe ser >= 0'),
});
type OpenForm = z.infer<typeof openSchema>;

const closeSchema = z.object({
  saldoFinal: z.number({ message: 'Requerido' }).gte(0, 'Debe ser >= 0'),
});
type CloseForm = z.infer<typeof closeSchema>;

const movementSchema = z.object({
  tipo: z.enum(['INGRESO_MANUAL', 'AJUSTE', 'RETIRO']),
  monto: z.number({ message: 'Requerido' }).gt(0, 'Debe ser > 0'),
  descripcion: z.string().optional(),
});
type MovementForm = z.infer<typeof movementSchema>;

const expenseSchema = z.object({
  categoria: z.string().min(1, 'Requerida'),
  descripcion: z.string().min(1, 'Requerida'),
  valor: z.number({ message: 'Requerido' }).gt(0, 'Debe ser > 0'),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No fue posible leer el archivo'));
    reader.readAsDataURL(file);
  });
}

async function uploadExpenseReceipt(file: File, token: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'expenses');

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
    throw new Error('message' in payload && payload.message ? String(payload.message) : 'Error al subir comprobante');
  }
  return 'data' in payload ? payload.data : (payload as UploadResponse);
}

export default function CashClient() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('register');
  const [movementOpen, setMovementOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [expenseReceipt, setExpenseReceipt] = useState<ExpenseReceiptState | null>(null);
  const expenseReceiptFileRef = useRef<HTMLInputElement>(null);
  const expenseReceiptCameraRef = useRef<HTMLInputElement>(null);

  const { data: current, isLoading: loadingCurrent } = useCurrentCashRegister();
  const { data: registers = [], isLoading: loadingRegisters } = useCashRegisters();
  const openMutation = useOpenCashRegister();
  const closeMutation = useCloseCashRegister();
  const movementMutation = useCreateCashMovement();
  const { data: expenses = [], isLoading: loadingExpenses } = useExpenses();
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const extractExpenseReceiptMutation = useExtractExpenseReceipt();

  const todayExpenses = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return expenses.filter((e) => e.fecha.slice(0, 10) === today).reduce((s, e) => s + e.valor, 0);
  }, [expenses]);

  const openForm = useForm<OpenForm>({
    resolver: zodResolver(openSchema),
    defaultValues: { saldoInicial: 0 },
  });

  const closeForm = useForm<CloseForm>({
    resolver: zodResolver(closeSchema),
    defaultValues: { saldoFinal: 0 },
  });

  const movementForm = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
    defaultValues: { tipo: 'INGRESO_MANUAL', monto: 0, descripcion: '' },
  });
  const movementType = useWatch({ control: movementForm.control, name: 'tipo' });

  const expenseForm = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { categoria: '', descripcion: '', valor: 0 },
  });
  const expenseCategory = useWatch({ control: expenseForm.control, name: 'categoria' });

  const editExpenseForm = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
  });

  useEffect(() => {
    if (current) {
      closeForm.setValue('saldoFinal', current.saldoEsperado ?? 0);
    }
  }, [current, closeForm]);

  useEffect(() => {
    if (editingExpense) {
      editExpenseForm.reset({
        categoria: editingExpense.categoria,
        descripcion: editingExpense.descripcion,
        valor: editingExpense.valor,
      });
    }
  }, [editingExpense, editExpenseForm]);

  function handleOpenCash(data: OpenForm) {
    openMutation.mutate(data, {
      onSuccess: () => { toast.success('Caja abierta'); openForm.reset(); },
      onError: () => toast.error('Error al abrir caja'),
    });
  }

  function handleCloseCash(data: CloseForm) {
    if (!current) return;
    closeMutation.mutate({ id: current.id, input: data }, {
      onSuccess: () => { toast.success('Caja cerrada'); closeForm.reset(); },
      onError: () => toast.error('Error al cerrar caja'),
    });
  }

  function handleMovement(data: MovementForm) {
    if (!current) return;
    movementMutation.mutate({ cashRegisterId: current.id, input: { ...data, descripcion: data.descripcion || undefined } }, {
      onSuccess: () => { toast.success('Movimiento registrado'); movementForm.reset(); setMovementOpen(false); },
      onError: () => toast.error('Error al registrar movimiento'),
    });
  }

  function handleCreateExpense(data: ExpenseForm) {
    createExpenseMutation.mutate({
      ...data,
      comprobanteUrl: expenseReceipt?.url,
      comprobanteNombre: expenseReceipt?.name,
      comprobanteMime: expenseReceipt?.mime,
      comprobanteIaTexto: expenseReceipt?.iaText,
      comprobanteIaJson: expenseReceipt?.iaJson,
    }, {
      onSuccess: () => { toast.success('Gasto registrado'); expenseForm.reset(); setExpenseReceipt(null); setExpenseOpen(false); },
      onError: () => toast.error('Error al registrar gasto'),
    });
  }

  async function handleExpenseReceipt(file: File) {
    if (!token) {
      toast.error('No autenticado');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Archivo demasiado grande (max 15MB)');
      return;
    }

    setUploadingReceipt(true);
    try {
      const uploaded = await uploadExpenseReceipt(file, token);
      const nextReceipt: ExpenseReceiptState = {
        url: uploaded.url,
        name: uploaded.originalName ?? file.name,
        mime: uploaded.mimetype ?? file.type,
      };

      if (file.type.startsWith('image/')) {
        const fileBase64 = await readFileAsDataUrl(file);
        const result = await extractExpenseReceiptMutation.mutateAsync({
          fileBase64,
          mimeType: file.type,
          fileName: file.name,
        });
        const extracted = result.extracted;
        nextReceipt.iaText = result.rawText;
        nextReceipt.iaJson = extracted as Record<string, unknown>;
        if (extracted.categoria && expenseCategoryOptions.includes(extracted.categoria)) {
          expenseForm.setValue('categoria', extracted.categoria);
        }
        if (extracted.descripcion) expenseForm.setValue('descripcion', extracted.descripcion);
        if (extracted.total && extracted.total > 0) expenseForm.setValue('valor', extracted.total);
        toast.success('Comprobante analizado con IA');
      } else {
        toast.success('Comprobante adjuntado. El PDF se diligencia manualmente.');
      }

      setExpenseReceipt(nextReceipt);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible procesar el comprobante');
    } finally {
      setUploadingReceipt(false);
      if (expenseReceiptFileRef.current) expenseReceiptFileRef.current.value = '';
      if (expenseReceiptCameraRef.current) expenseReceiptCameraRef.current.value = '';
    }
  }

  function handleUpdateExpense(data: ExpenseForm) {
    if (!editingExpense) return;
    updateExpenseMutation.mutate({ id: editingExpense.id, input: data }, {
      onSuccess: () => { toast.success('Gasto actualizado'); setEditingExpense(null); },
      onError: () => toast.error('Error al actualizar gasto'),
    });
  }

  function handleDeleteExpense() {
    if (!deleteTarget) return;
    deleteExpenseMutation.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Gasto eliminado'); setDeleteTarget(null); },
      onError: () => toast.error('Error al eliminar gasto'),
    });
  }

  const expenseColumns: ColumnDef<Expense>[] = useMemo(() => [
    { accessorKey: 'fecha', header: 'Fecha', cell: ({ row }) => formatDateTime(row.original.fecha) },
    { accessorKey: 'categoria', header: 'Categoría', cell: ({ row }) => <Badge variant="secondary">{row.original.categoria}</Badge> },
    { accessorKey: 'descripcion', header: 'Descripción' },
    {
      accessorKey: 'comprobanteUrl',
      header: 'Soporte',
      cell: ({ row }) => row.original.comprobanteUrl ? (
        <a className="inline-flex items-center gap-1 text-xs text-primary hover:underline" href={row.original.comprobanteUrl} target="_blank" rel="noreferrer">
          <ExternalLink className="size-3" />
          {row.original.comprobanteIaTexto ? 'IA aplicada' : 'Abrir'}
        </a>
      ) : <span className="text-xs text-muted-foreground">Sin soporte</span>,
    },
    { accessorKey: 'valor', header: 'Valor', cell: ({ row }) => formatCopCentavos(row.original.valor) },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon-xs" variant="ghost" onClick={() => setEditingExpense(row.original)}><Pencil className="size-3" /></Button>
          <Button size="icon-xs" variant="ghost" onClick={() => setDeleteTarget(row.original)}><Trash2 className="size-3" /></Button>
        </div>
      ),
    },
  ], []);

  const loading = loadingCurrent || loadingRegisters || loadingExpenses;

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Caja y gastos" description="Apertura, movimientos, gastos y cierre de caja.">
        <Button variant="outline" size="icon" onClick={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.cashRegisters.all });
          void queryClient.invalidateQueries({ queryKey: queryKeys.cashRegisters.current });
          void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
        }} title="Actualizar"><RefreshCw className="size-4" /></Button>
      </PageHeader>

      <StaggerList><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Estado</p>
            <p className="text-2xl font-bold">{current ? 'Abierta' : 'Cerrada'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Balance esperado</p>
            <p className="text-2xl font-bold">{formatCopCentavos(current?.saldoEsperado ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Gastos hoy</p>
            <p className="text-2xl font-bold">{formatCopCentavos(todayExpenses)}</p>
          </CardContent>
        </Card>
      </div></StaggerList>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="register">Caja Registradora</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4 mt-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <WalletCards className="size-5" />
                    <div>
                      <CardTitle className="text-lg">{current ? 'Caja abierta' : 'Abrir caja'}</CardTitle>
                      <CardDescription>
                        {current ? `Desde ${formatDateTime(current.fechaApertura)}` : 'Registra el saldo inicial para abrir caja.'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {current ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Saldo inicial</p>
                          <p className="text-lg font-semibold">{formatCopCentavos(current.saldoInicial)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Ingresos</p>
                          <p className="text-lg font-semibold text-emerald-600">{formatCopCentavos(current.ingresos ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Egresos</p>
                          <p className="text-lg font-semibold text-red-600">{formatCopCentavos(current.egresos ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Diferencia</p>
                          <p className="text-lg font-semibold">{formatCopCentavos(current.diferencia ?? 0)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setMovementOpen(true)}>
                          <PlusCircle className="size-4 mr-1" /> Movimiento manual
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={openForm.handleSubmit(handleOpenCash)} className="flex flex-wrap items-end gap-3">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="openAmount">Saldo inicial (COP)</Label>
                        <Input id="openAmount" type="number" min={0} step={100} {...openForm.register('saldoInicial', { valueAsNumber: true })} />
                        {openForm.formState.errors.saldoInicial && (
                          <p className="text-xs text-destructive">{openForm.formState.errors.saldoInicial.message}</p>
                        )}
                      </div>
                      <Button type="submit" disabled={openMutation.isPending}>
                        <Banknote className="size-4 mr-1" /> Abrir caja
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              {current && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Movimientos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(current.movements?.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Sin movimientos.</p>
                      ) : (
                        <div className="space-y-2">
                          {current.movements!.map((m) => (
                            <div key={m.id} className="flex items-center justify-between border-b pb-2 text-sm">
                              <div>
                                <span className="font-medium">{movementLabels[m.tipo] ?? m.tipo}</span>
                                {m.descripcion && <p className="text-muted-foreground text-xs">{m.descripcion}</p>}
                                <p className="text-muted-foreground text-xs">{formatDateTime(m.fecha)}</p>
                              </div>
                              <span className={`font-semibold ${(m.tipo === 'VENTA' || m.tipo === 'INGRESO_MANUAL' || m.tipo === 'APERTURA') ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCopCentavos(m.monto)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Cerrar caja</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={closeForm.handleSubmit(handleCloseCash)} className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="closeAmount">Saldo real (COP)</Label>
                          <Input id="closeAmount" type="number" min={0} step={100} {...closeForm.register('saldoFinal', { valueAsNumber: true })} />
                          {closeForm.formState.errors.saldoFinal && (
                            <p className="text-xs text-destructive">{closeForm.formState.errors.saldoFinal.message}</p>
                          )}
                        </div>
                        <Button type="submit" variant="destructive" disabled={closeMutation.isPending}>
                          Cerrar caja
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </>
              )}

              {!current && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Historial de cajas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {registers.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">Sin cajas registradas.</p>
                      ) : registers.slice(0, 8).map((r) => (
                        <div key={r.id} className="flex items-center justify-between border-b pb-2 text-sm">
                          <div>
                            <Badge variant={r.estado === 'ABIERTA' ? 'default' : 'secondary'}>{r.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'}</Badge>
                            <p className="text-muted-foreground text-xs mt-1">{formatDateTime(r.fechaApertura)}</p>
                          </div>
                          <span className="font-semibold">{formatCopCentavos(r.saldoFinal ?? r.saldoEsperado ?? r.saldoInicial)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setExpenseOpen(true)}><PlusCircle className="size-4 mr-1" /> Registrar gasto</Button>
          </div>
          {loadingExpenses ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <DataTable columns={expenseColumns} data={expenses} />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimiento manual</DialogTitle>
          </DialogHeader>
          <form onSubmit={movementForm.handleSubmit(handleMovement)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={movementType} onValueChange={(v) => { if (v !== null) movementForm.setValue('tipo', v as MovementForm['tipo']); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INGRESO_MANUAL">Ingreso manual</SelectItem>
                    <SelectItem value="RETIRO">Retiro</SelectItem>
                    <SelectItem value="AJUSTE">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Monto (COP)</Label>
                <Input type="number" min={0} step={100} {...movementForm.register('monto', { valueAsNumber: true })} />
                {movementForm.formState.errors.monto && <p className="text-xs text-destructive">{movementForm.formState.errors.monto.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input {...movementForm.register('descripcion')} />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={movementMutation.isPending}>
                <PlusCircle className="size-4 mr-1" /> Registrar movimiento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={(open: boolean) => { setExpenseOpen(open); if (!open) setExpenseReceipt(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={expenseForm.handleSubmit(handleCreateExpense)} className="space-y-3">
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={expenseCategory} onValueChange={(v) => expenseForm.setValue('categoria', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {expenseCategoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {expenseForm.formState.errors.categoria && <p className="text-xs text-destructive">{expenseForm.formState.errors.categoria.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input {...expenseForm.register('descripcion')} />
              {expenseForm.formState.errors.descripcion && <p className="text-xs text-destructive">{expenseForm.formState.errors.descripcion.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Valor (COP)</Label>
              <Input type="number" min={0} step={100} {...expenseForm.register('valor', { valueAsNumber: true })} />
              {expenseForm.formState.errors.valor && <p className="text-xs text-destructive">{expenseForm.formState.errors.valor.message}</p>}
            </div>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Comprobante del gasto</p>
                  <p className="text-xs text-muted-foreground">
                    {expenseReceipt?.name || expenseReceipt?.url || 'Toma foto o sube imagen/PDF del soporte'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={expenseReceiptCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleExpenseReceipt(file);
                    }}
                  />
                  <input
                    ref={expenseReceiptFileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleExpenseReceipt(file);
                    }}
                  />
                  <Button type="button" variant="outline" disabled={uploadingReceipt || extractExpenseReceiptMutation.isPending} onClick={() => expenseReceiptCameraRef.current?.click()}>
                    <Camera className="size-4 mr-1" /> Tomar foto
                  </Button>
                  <Button type="button" variant="outline" disabled={uploadingReceipt || extractExpenseReceiptMutation.isPending} onClick={() => expenseReceiptFileRef.current?.click()}>
                    <UploadCloud className="size-4 mr-1" /> Subir soporte
                  </Button>
                </div>
              </div>
              {expenseReceipt?.iaText ? (
                <div className="mt-3 rounded-md bg-background p-3 text-xs text-muted-foreground">
                  <div className="mb-1 flex items-center gap-1 font-medium text-foreground"><Bot className="size-3" /> Vision aplicada</div>
                  {expenseReceipt.iaText.slice(0, 260)}
                </div>
              ) : null}
            </div>
            <DialogFooter showCloseButton>
              <Button variant="destructive" type="submit" disabled={createExpenseMutation.isPending || uploadingReceipt}>Registrar gasto</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingExpense} onOpenChange={(open: boolean) => { if (!open) setEditingExpense(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={editExpenseForm.handleSubmit(handleUpdateExpense)} className="space-y-3">
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Input {...editExpenseForm.register('categoria')} />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input {...editExpenseForm.register('descripcion')} />
            </div>
            <div className="space-y-1">
              <Label>Valor (COP)</Label>
              <Input type="number" min={0} step={100} {...editExpenseForm.register('valor', { valueAsNumber: true })} />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={updateExpenseMutation.isPending}>Guardar cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar gasto"
        description={`¿Estás seguro de eliminar el gasto "${deleteTarget?.descripcion}"?`}
        variant="destructive"
        confirmLabel="Eliminar"
        onConfirm={handleDeleteExpense}
      />
    </FadeIn>
  );
}
