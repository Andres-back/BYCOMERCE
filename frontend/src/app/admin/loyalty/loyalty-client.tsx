'use client';

import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { Award, Gift, Layers, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/data-table';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getProgram,
  updateProgram,
  getTiers,
  createTier,
  updateTier,
  getRewards,
  createReward,
  updateReward,
} from '@/services/loyalty/loyalty.service';
import type { LoyaltyProgram, LoyaltyTier, LoyaltyReward } from '@/services/loyalty/loyalty.service';

const tierSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  nivel: z.coerce.number().int().min(1),
  color: z.string().optional(),
  multiplicador: z.coerce.number().min(0),
  puntosMinimos: z.coerce.number().int().min(0),
});
type TierFormValues = z.infer<typeof tierSchema>;

const rewardSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  tipo: z.enum(['DESCUENTO', 'PRODUCTO', 'ENVIO']),
  valor: z.coerce.number().int().min(0),
  puntosNecesarios: z.coerce.number().int().min(1),
  stock: z.coerce.number().int().min(0),
  imagen: z.string().optional(),
  activo: z.boolean(),
});
type RewardFormValues = z.infer<typeof rewardSchema>;

export default function LoyaltyClient() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('program');

  const { data: program, refetch: refetchProgram } = useQuery({
    queryKey: ['loyalty-program'],
    queryFn: () => getProgram(token!),
    enabled: !!token,
  });
  const { data: tiers = [], refetch: refetchTiers } = useQuery({
    queryKey: ['loyalty-tiers'],
    queryFn: () => getTiers(token!),
    enabled: !!token,
  });
  const { data: rewards = [], refetch: refetchRewards } = useQuery({
    queryKey: ['loyalty-rewards'],
    queryFn: () => getRewards(token!),
    enabled: !!token,
  });

  const updateProgramMutation = useMutation({
    mutationFn: (data: Partial<LoyaltyProgram>) => updateProgram(token!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty-program'] }); toast.success('Programa actualizado'); },
    onError: () => toast.error('Error al actualizar programa'),
  });

  const createTierMutation = useMutation({
    mutationFn: (data: Partial<LoyaltyTier>) => createTier(token!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty-tiers'] }); toast.success('Nivel creado'); },
    onError: () => toast.error('Error al crear nivel'),
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LoyaltyTier> }) => updateTier(token!, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty-tiers'] }); toast.success('Nivel actualizado'); },
    onError: () => toast.error('Error al actualizar nivel'),
  });

  const createRewardMutation = useMutation({
    mutationFn: (data: Partial<LoyaltyReward>) => createReward(token!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty-rewards'] }); toast.success('Recompensa creada'); },
    onError: () => toast.error('Error al crear recompensa'),
  });

  const updateRewardMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LoyaltyReward> }) => updateReward(token!, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty-rewards'] }); toast.success('Recompensa actualizada'); },
    onError: () => toast.error('Error al actualizar recompensa'),
  });

  const [progPuntosPorPeso, setProgPuntosPorPeso] = useState(100);
  const [progPesoPorPunto, setProgPesoPorPunto] = useState(100);
  const [progExpiracion, setProgExpiracion] = useState(365);
  const [progBienvenida, setProgBienvenida] = useState(0);
  const [progActivo, setProgActivo] = useState(true);

  useEffect(() => {
    if (program) {
      setProgPuntosPorPeso(program.puntosPorPeso);
      setProgPesoPorPunto(program.pesoPorPunto);
      setProgExpiracion(program.expiracionDias);
      setProgBienvenida(program.puntosBienvenida);
      setProgActivo(program.activo);
    }
  }, [program]);

  function handleProgramSave() {
    updateProgramMutation.mutate({
      puntosPorPeso: progPuntosPorPeso,
      pesoPorPunto: progPesoPorPunto,
      expiracionDias: progExpiracion,
      puntosBienvenida: progBienvenida,
      activo: progActivo,
    });
  }

  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);

  const tierForm = useForm<TierFormValues>({
    defaultValues: { nombre: '', nivel: 1, color: '#6B7280', multiplicador: 1, puntosMinimos: 0 },
    values: editingTier ? {
      nombre: editingTier.nombre,
      nivel: editingTier.nivel,
      color: editingTier.color ?? '#6B7280',
      multiplicador: editingTier.multiplicador,
      puntosMinimos: editingTier.puntosMinimos,
    } : undefined,
  });

  function openTierCreate() {
    setEditingTier(null);
    tierForm.reset({ nombre: '', nivel: 1, color: '#6B7280', multiplicador: 1, puntosMinimos: 0 });
    setTierDialogOpen(true);
  }

  function openTierEdit(tier: LoyaltyTier) {
    setEditingTier(tier);
    setTierDialogOpen(true);
  }

  async function handleTierSubmit(values: TierFormValues) {
    if (editingTier) {
      await updateTierMutation.mutateAsync({ id: editingTier.id, data: values });
    } else {
      await createTierMutation.mutateAsync(values);
    }
    setTierDialogOpen(false);
  }

  const tierColumns: ColumnDef<LoyaltyTier>[] = useMemo(() => [
    {
      accessorKey: 'color',
      header: '',
      cell: ({ row }) => (
        <div className="size-5 rounded-full border" style={{ backgroundColor: row.original.color ?? '#6B7280' }} />
      ),
    },
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'nivel', header: 'Nivel' },
    {
      accessorKey: 'multiplicador',
      header: 'Multiplicador',
      cell: ({ row }) => `${row.original.multiplicador}x`,
    },
    {
      accessorKey: 'puntosMinimos',
      header: 'Puntos mínimos',
      cell: ({ row }) => row.original.puntosMinimos.toLocaleString(),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => openTierEdit(row.original)}>
            <Pencil className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);

  const rewardForm = useForm<RewardFormValues>({
    defaultValues: { nombre: '', descripcion: '', tipo: 'DESCUENTO', valor: 0, puntosNecesarios: 100, stock: 0, imagen: '', activo: true },
    values: editingReward ? {
      nombre: editingReward.nombre,
      descripcion: editingReward.descripcion ?? '',
      tipo: editingReward.tipo as RewardFormValues['tipo'],
      valor: editingReward.valor,
      puntosNecesarios: editingReward.puntosNecesarios,
      stock: editingReward.stock,
      imagen: editingReward.imagen ?? '',
      activo: editingReward.activo,
    } : undefined,
  });

  function openRewardCreate() {
    setEditingReward(null);
    rewardForm.reset({ nombre: '', descripcion: '', tipo: 'DESCUENTO', valor: 0, puntosNecesarios: 100, stock: 0, imagen: '', activo: true });
    setRewardDialogOpen(true);
  }

  function openRewardEdit(reward: LoyaltyReward) {
    setEditingReward(reward);
    setRewardDialogOpen(true);
  }

  async function handleRewardSubmit(values: RewardFormValues) {
    if (editingReward) {
      await updateRewardMutation.mutateAsync({ id: editingReward.id, data: values });
    } else {
      await createRewardMutation.mutateAsync(values);
    }
    setRewardDialogOpen(false);
  }

  const tipoLabels: Record<string, string> = {
    DESCUENTO: 'Descuento',
    PRODUCTO: 'Producto',
    ENVIO: 'Envío gratis',
  };

  const rewardColumns: ColumnDef<LoyaltyReward>[] = useMemo(() => [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => tipoLabels[row.original.tipo] ?? row.original.tipo,
    },
    {
      accessorKey: 'valor',
      header: 'Valor',
      cell: ({ row }) => row.original.tipo === 'DESCUENTO' ? `${row.original.valor}%` : `$${row.original.valor.toLocaleString()}`,
    },
    {
      accessorKey: 'puntosNecesarios',
      header: 'Puntos',
      cell: ({ row }) => row.original.puntosNecesarios.toLocaleString(),
    },
    { accessorKey: 'stock', header: 'Stock' },
    {
      accessorKey: 'activo',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.activo ? 'default' : 'secondary'}>
          {row.original.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => openRewardEdit(row.original)}>
            <Pencil className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  return (
    <FadeIn as="main" className="space-y-4">
      <PageHeader title="Fidelización" description="Programa de puntos y recompensas">
        <Button variant="outline" size="icon" onClick={() => { refetchProgram(); refetchTiers(); refetchRewards(); }}>
          <RefreshCw className="size-4" />
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="program" className="gap-2">
            <Award className="size-4" />
            Programa
          </TabsTrigger>
          <TabsTrigger value="tiers" className="gap-2">
            <Layers className="size-4" />
            Niveles
          </TabsTrigger>
          <TabsTrigger value="rewards" className="gap-2">
            <Gift className="size-4" />
            Recompensas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="program" className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Switch checked={progActivo} onCheckedChange={setProgActivo} />
                <Label>Programa activo</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Puntos por cada $1,000</Label>
                  <Input type="number" value={progPuntosPorPeso} onChange={(e) => setProgPuntosPorPeso(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>Peso por punto (COP)</Label>
                  <Input type="number" value={progPesoPorPunto} onChange={(e) => setProgPesoPorPunto(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>Días de expiración</Label>
                  <Input type="number" value={progExpiracion} onChange={(e) => setProgExpiracion(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>Puntos de bienvenida</Label>
                  <Input type="number" value={progBienvenida} onChange={(e) => setProgBienvenida(Number(e.target.value))} />
                </div>
              </div>
              <Button onClick={handleProgramSave} disabled={updateProgramMutation.isPending}>
                {updateProgramMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openTierCreate}>
              <Plus className="mr-1 size-4" />
              Crear nivel
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <DataTable columns={tierColumns} data={tiers} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openRewardCreate}>
              <Plus className="mr-1 size-4" />
              Crear recompensa
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <DataTable columns={rewardColumns} data={rewards} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Editar nivel' : 'Crear nivel'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={tierForm.handleSubmit(handleTierSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Nombre</Label>
                <Input {...tierForm.register('nombre')} />
                {tierForm.formState.errors.nombre && <p className="text-xs text-destructive">{tierForm.formState.errors.nombre.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Nivel</Label>
                <Input type="number" {...tierForm.register('nivel')} />
              </div>
              <div className="space-y-1">
                <Label>Color</Label>
                <Input type="color" {...tierForm.register('color')} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label>Multiplicador</Label>
                <Input type="number" step="0.1" {...tierForm.register('multiplicador')} />
              </div>
              <div className="space-y-1">
                <Label>Puntos mínimos</Label>
                <Input type="number" {...tierForm.register('puntosMinimos')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTierDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createTierMutation.isPending || updateTierMutation.isPending}>
                {editingTier ? 'Guardar cambios' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReward ? 'Editar recompensa' : 'Crear recompensa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={rewardForm.handleSubmit(handleRewardSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Nombre</Label>
                <Input {...rewardForm.register('nombre')} />
                {rewardForm.formState.errors.nombre && <p className="text-xs text-destructive">{rewardForm.formState.errors.nombre.message}</p>}
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Descripción</Label>
                <Input {...rewardForm.register('descripcion')} />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={rewardForm.watch('tipo')} onValueChange={(v) => rewardForm.setValue('tipo', v as RewardFormValues['tipo'])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor</Label>
                <Input type="number" {...rewardForm.register('valor')} />
              </div>
              <div className="space-y-1">
                <Label>Puntos necesarios</Label>
                <Input type="number" {...rewardForm.register('puntosNecesarios')} />
              </div>
              <div className="space-y-1">
                <Label>Stock</Label>
                <Input type="number" {...rewardForm.register('stock')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>URL imagen</Label>
                <Input {...rewardForm.register('imagen')} placeholder="https://..." />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch
                  checked={rewardForm.watch('activo')}
                  onCheckedChange={(v) => rewardForm.setValue('activo', v)}
                />
                <Label>Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRewardDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createRewardMutation.isPending || updateRewardMutation.isPending}>
                {editingReward ? 'Guardar cambios' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
