'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { queryKeys } from '@/lib/query-keys';
import { getPreferences, updatePreferences } from '@/services/notifications/notifications.service';
import { useAuthStore } from '@/stores/auth-store';
import { useState } from 'react';

const TIPO_LABELS: Record<string, string> = {
  STOCK_BAJO: 'Stock bajo',
  PEDIDO_NUEVO: 'Nuevo pedido',
  PEDIDO_CONFIRMADO: 'Pedido confirmado',
  PEDIDO_CANCELADO: 'Pedido cancelado',
  PAGO_RECIBIDO: 'Pago recibido',
  SUSCRIPCION_VENCER: 'Suscripción por vencer',
  SUSCRIPCION_VENCIDA: 'Suscripción vencida',
  LIMITE_EXCEDIDO: 'Límite excedido',
  USUARIO_NUEVO: 'Usuario nuevo',
  LOGIN_SOSPECHOSO: 'Inicio de sesión sospechoso',
};

export default function NotificationsClient() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean>>({});

  const { data: prefs, isLoading } = useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: () => getPreferences(token!),
    enabled: !!token,
  });

  const saveMutation = useMutation({
    mutationFn: (preferencias: { tipo: string; canal: string; activo: boolean }[]) =>
      updatePreferences(token!, { preferencias }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.preferences });
      toast.success('Preferencias guardadas');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar'),
  });

  if (!token) return null;

  const currentPrefs = prefs ?? [];

  function getEffectiveActivo(tipo: string): boolean {
    if (tipo in localPrefs) return localPrefs[tipo];
    const p = currentPrefs.find((x) => x.tipo === tipo);
    return p?.activo ?? true;
  }

  function toggle(tipo: string) {
    setLocalPrefs((prev) => ({
      ...prev,
      [tipo]: !getEffectiveActivo(tipo),
    }));
  }

  function handleSave() {
    const preferencias = Object.entries(localPrefs).map(([tipo, activo]) => ({
      tipo,
      canal: 'in_app',
      activo,
    }));
    saveMutation.mutate(preferencias);
    setLocalPrefs({});
  }

  const hasChanges = Object.keys(localPrefs).length > 0;

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Notificaciones" description="Configura qué notificaciones deseas recibir en la aplicación." />

      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="size-4" /> Preferencias de notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {currentPrefs.map((p) => (
              <div
                key={p.tipo}
                className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium">{TIPO_LABELS[p.tipo] ?? p.tipo}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.tipo.replace(/_/g, ' ').toLowerCase()}</p>
                </div>
                <Switch
                  checked={getEffectiveActivo(p.tipo)}
                  onCheckedChange={() => toggle(p.tipo)}
                />
              </div>
            ))}
            {hasChanges && (
              <>
                <Separator className="my-2" />
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
                    Guardar cambios
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </FadeIn>
  );
}
