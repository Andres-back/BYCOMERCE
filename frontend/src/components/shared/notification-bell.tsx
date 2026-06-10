'use client';

import { useState } from 'react';
import { Bell, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/services/notifications/notifications.service';

export function NotificationBell() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unread = 0 } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => getUnreadCount(token!),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: queryKeys.notifications.list(1),
    queryFn: () => listNotifications(token!),
    enabled: !!token && open,
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => markAsRead(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => markAllAsRead(token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      toast.success('Notificaciones marcadas como leídas');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteNotification(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-medium">Notificaciones</span>
          {unread > 0 && (
            <Button variant="ghost" size="icon-xs" onClick={() => markAllMut.mutate()} title="Marcar todas leídas">
              <CheckCheck className="size-3.5" />
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : !notifications?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin notificaciones</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/50',
                  !n.leida && 'bg-primary/5',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn('font-medium', !n.leida && 'text-primary')}>{n.titulo}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.mensaje}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  {!n.leida && (
                    <Button variant="ghost" size="icon-xs" onClick={() => markReadMut.mutate(n.id)} title="Marcar leída">
                      <CheckCheck className="size-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-xs" onClick={() => deleteMut.mutate(n.id)} title="Eliminar">
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
