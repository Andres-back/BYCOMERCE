'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

let globalSocket: Socket | null = null;

function getSocket(token: string): Socket {
  if (globalSocket?.connected) return globalSocket;

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

  globalSocket = io(wsUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  return globalSocket;
}

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', () => {
      console.log('[WS] Connected');
    });

    socket.on('connected', (data: { userId: string; tenantId: string }) => {
      console.log('[WS] Authenticated', data);
    });

    const invalidateProducts = () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    };

    const invalidateOrders = () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    };

    const invalidateSales = () => {
      qc.invalidateQueries({ queryKey: ['pos-sales'] });
    };

    const invalidateDashboard = () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const invalidateNotifications = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('order:created', (data) => {
      invalidateOrders();
      toast.info('Nuevo pedido', { description: `Pedido recibido` });
    });

    socket.on('order:status_changed', (data) => {
      invalidateOrders();
    });

    socket.on('product:updated', invalidateProducts);
    socket.on('stock:adjusted', invalidateProducts);
    socket.on('sale:created', invalidateSales);
    socket.on('sale:voided', invalidateSales);
    socket.on('dashboard:refresh', invalidateDashboard);
    socket.on('notification', invalidateNotifications);

    socket.on('disconnect', () => {
      console.log('[WS] Disconnected');
    });

    return () => {
      socket.off('order:created', invalidateOrders);
      socket.off('order:status_changed', invalidateOrders);
      socket.off('product:updated', invalidateProducts);
      socket.off('stock:adjusted', invalidateProducts);
      socket.off('sale:created', invalidateSales);
      socket.off('sale:voided', invalidateSales);
      socket.off('dashboard:refresh', invalidateDashboard);
      socket.off('notification', invalidateNotifications);
    };
  }, [token, qc]);

  return socketRef.current;
}