'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { appToast } from '@/lib/app-toast';

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (globalSocket?.connected) return globalSocket;

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

  globalSocket = io(wsUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  return globalSocket;
}

export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => undefined;
    const handleConnected = () => undefined;

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

    const handleOrderCreated = () => {
      invalidateOrders();
      appToast.info('Nuevo pedido', { id: 'socket-order-created', description: 'Pedido recibido' });
    };

    const handleOrderStatusChanged = () => {
      invalidateOrders();
    };

    const handleDisconnect = () => undefined;

    socket.on('connect', handleConnect);
    socket.on('connected', handleConnected);
    socket.on('order:created', handleOrderCreated);
    socket.on('order:status_changed', handleOrderStatusChanged);
    socket.on('product:updated', invalidateProducts);
    socket.on('stock:adjusted', invalidateProducts);
    socket.on('sale:created', invalidateSales);
    socket.on('sale:voided', invalidateSales);
    socket.on('dashboard:refresh', invalidateDashboard);
    socket.on('notification', invalidateNotifications);

    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connected', handleConnected);
      socket.off('order:created', handleOrderCreated);
      socket.off('order:status_changed', handleOrderStatusChanged);
      socket.off('product:updated', invalidateProducts);
      socket.off('stock:adjusted', invalidateProducts);
      socket.off('sale:created', invalidateSales);
      socket.off('sale:voided', invalidateSales);
      socket.off('dashboard:refresh', invalidateDashboard);
      socket.off('notification', invalidateNotifications);
      socket.off('disconnect', handleDisconnect);
    };
  }, [isAuthenticated, qc]);

  return globalSocket;
}
