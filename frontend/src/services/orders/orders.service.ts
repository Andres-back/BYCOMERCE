import { apiGet, apiPost } from '@/services/api/client';
import { Order, PaymentMethod, UserSummary } from '@/types/api';

export interface CreateOrderItemInput {
  productId: string;
  cantidad: number;
}

export interface CreateOrderInput {
  tenantSlug: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  observaciones?: string;
  metodoPago?: PaymentMethod;
  items: CreateOrderItemInput[];
}

export interface DeliverOrderInput {
  metodoPago?: PaymentMethod;
  montoRecibido?: number;
  referenciaExterna?: string;
  motivo?: string;
}

export function createOrder(input: CreateOrderInput) {
  return apiPost<Order, CreateOrderInput>('/orders', input);
}

export function listOrders(token: string) {
  return apiGet<Order[]>('/orders', token);
}

export function listDeliveryUsers(token: string) {
  return apiGet<UserSummary[]>('/orders/delivery-users', token);
}

export function assignDelivery(token: string, orderId: string, deliveryUserId: string) {
  return apiPost<Order, { deliveryUserId: string }>(`/orders/${orderId}/assign-delivery`, { deliveryUserId }, token);
}

export function confirmOrder(token: string, orderId: string) {
  return apiPost<Order, Record<string, never>>(`/orders/${orderId}/confirm`, {}, token);
}

export function markOrderPreparing(token: string, orderId: string) {
  return apiPost<Order, Record<string, never>>(`/orders/${orderId}/preparing`, {}, token);
}

export function markOrderReady(token: string, orderId: string) {
  return apiPost<Order, Record<string, never>>(`/orders/${orderId}/ready`, {}, token);
}

export function dispatchOrder(token: string, orderId: string) {
  return apiPost<Order, Record<string, never>>(`/orders/${orderId}/dispatch`, {}, token);
}

export function deliverOrder(token: string, orderId: string, input: DeliverOrderInput) {
  return apiPost<Order, DeliverOrderInput>(`/orders/${orderId}/deliver`, input, token);
}

export function cancelOrder(token: string, orderId: string, motivo?: string) {
  return apiPost<Order, { motivo?: string }>(`/orders/${orderId}/cancel`, { motivo }, token);
}

export function rejectOrder(token: string, orderId: string, motivo?: string) {
  return apiPost<Order, { motivo?: string }>(`/orders/${orderId}/reject`, { motivo }, token);
}

export interface DeliveryRouteOrder {
  id: string;
  customer: { nombre: string; telefono: string | null; direccion: string | null } | null;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  total: number;
  estado: string;
  distanciaKm: number;
  items: Array<{ product: { nombre: string } }>;
}

export interface DeliveryRoute {
  business: { nombre: string; direccion: string | null; latitud: number | null; longitud: number | null };
  orders: DeliveryRouteOrder[];
  totalOrders: number;
  totalDistancia: number;
}

export function getDeliveryRoute(token: string) {
  return apiGet<DeliveryRoute>('/orders/delivery-route', token);
}
