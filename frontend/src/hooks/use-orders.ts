'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import {
  listOrders,
  listDeliveryUsers,
  confirmOrder,
  rejectOrder,
  cancelOrder,
  markOrderPreparing,
  markOrderReady,
  dispatchOrder,
  deliverOrder,
  assignDelivery,
  getDeliveryRoute,
} from '@/services/orders/orders.service';
import type { DeliverOrderInput, DeliveryRoute } from '@/services/orders/orders.service';

export function useOrders(token: string) {
  return useQuery({
    queryKey: queryKeys.orders.all,
    queryFn: () => listOrders(token),
    enabled: !!token,
  });
}

export function useOrder(token: string, id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: async () => {
      const orders = await listOrders(token);
      return orders.find((o) => o.id === id) ?? null;
    },
    enabled: !!token && !!id,
  });
}

export function useDeliveryUsers(token: string) {
  return useQuery({
    queryKey: ['delivery-users'],
    queryFn: () => listDeliveryUsers(token),
    enabled: !!token,
    placeholderData: (prev) => prev,
  });
}

export function useConfirmOrder(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => confirmOrder(token, orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success('Pedido confirmado');
    },
    onError: () => toast.error('No fue posible confirmar el pedido'),
  });
}

export function useRejectOrder(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, motivo }: { orderId: string; motivo?: string }) =>
      rejectOrder(token, orderId, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success('Pedido rechazado');
    },
    onError: () => toast.error('No fue posible rechazar el pedido'),
  });
}

export function useCancelOrder(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, motivo }: { orderId: string; motivo?: string }) =>
      cancelOrder(token, orderId, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success('Pedido cancelado');
    },
    onError: () => toast.error('No fue posible cancelar el pedido'),
  });
}

export function usePreparingOrder(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => markOrderPreparing(token, orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success('Pedido en preparacion');
    },
    onError: () => toast.error('No fue posible marcar el pedido en preparacion'),
  });
}

export function useReadyOrder(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => markOrderReady(token, orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success('Pedido listo para entrega');
    },
    onError: () => toast.error('No fue posible marcar el pedido como listo'),
  });
}

export function useDispatchOrder(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => dispatchOrder(token, orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success('Pedido despachado');
    },
    onError: () => toast.error('No fue posible despachar el pedido'),
  });
}

export function useDeliverOrder(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      input,
    }: {
      orderId: string;
      input: DeliverOrderInput;
    }) => deliverOrder(token, orderId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success('Pedido entregado');
    },
    onError: () => toast.error('No fue posible entregar el pedido'),
  });
}

export function useDeliveryRoute(token: string) {
  return useQuery({
    queryKey: ['delivery-route'],
    queryFn: () => getDeliveryRoute(token),
    enabled: !!token,
  });
}

export function useAssignDelivery(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, deliveryUserId }: { orderId: string; deliveryUserId: string }) =>
      assignDelivery(token, orderId, deliveryUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success('Domiciliario asignado');
    },
    onError: () => toast.error('No fue posible asignar domiciliario'),
  });
}