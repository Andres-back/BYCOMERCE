import { apiGet, apiPost } from '@/services/api/client';
import type { Business } from '@/types/api';

export interface PlanItem {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  periodicidad: string;
  limiteProductos: number;
  limiteUsuarios: number;
  limitePedidos: number;
  caracteristicas: string[];
  activo: boolean;
  createdAt: string;
}

export interface SubscriptionInfo {
  plan: PlanItem;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  uso: {
    productos: number;
    usuarios: number;
    pedidosMes: number;
  };
  limites: {
    productos: number;
    usuarios: number;
    pedidosMes: number;
  };
}

export interface PaymentItem {
  id: string;
  monto: number;
  metodo: string;
  estado: string;
  referenciaExterna?: string | null;
  comprobanteUrl?: string | null;
  observaciones?: string | null;
  createdAt: string;
}

export const planService = {
  list: () => apiGet<PlanItem[]>('/plans'),
  get: (id: string) => apiGet<PlanItem>(`/plans/${id}`),
  subscription: (token: string) => apiGet<SubscriptionInfo>('/tenants/me/subscription', token),
  changePlan: (token: string, planId: string, motivo?: string) =>
    apiPost<SubscriptionInfo, { planId: string; motivo?: string }>('/tenants/me/subscription/change-plan', { planId, motivo }, token),
  cancelSubscription: (token: string, motivo?: string) =>
    apiPost<void, { motivo?: string }>('/tenants/me/subscription/cancel', { motivo }, token),
  payments: (token: string) => apiGet<PaymentItem[]>('/tenants/me/subscription/payments', token),
  registerPayment: (token: string, data: { monto: number; metodo: string; comprobanteUrl?: string; referenciaExterna?: string; observaciones?: string }) =>
    apiPost<PaymentItem, typeof data>('/tenants/me/subscription/payments', data, token),
};