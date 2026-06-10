import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { listNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/services/notifications/notifications.service';
import { queryKeys } from '@/lib/query-keys';

export function useNotifications(page = 1) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.notifications.list(page),
    queryFn: () => listNotifications(token!, page),
    enabled: !!token,
  });
}

export function useUnreadCount() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => getUnreadCount(token!),
    enabled: !!token,
    refetchInterval: 30000,
  });
}

export function useMarkRead() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markAsRead(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllAsRead(token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
