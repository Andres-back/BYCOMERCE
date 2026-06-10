import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api/client';

export interface Promotion {
  id: string;
  nombre: string;
  descripcion?: string | null;
  tipo: 'PORCENTAJE' | 'MONTO_FIJO' | 'PRECIO_FIJO' | 'N_X_M' | 'COMBO' | 'ENVIO_GRATIS';
  alcance: 'GLOBAL' | 'CATEGORIA' | 'PRODUCTO' | 'CLIENTE_SEGMENTO';
  valor: number;
  valorMaximo?: number | null;
  minCompra?: number | null;
  minItems?: number | null;
  cantidadGratis?: number | null;
  fechaInicio: string;
  fechaFin: string;
  diasSemana?: number[] | null;
  horarioInicio?: string | null;
  horarioFin?: string | null;
  segmento?: string | null;
  maxUsos?: number | null;
  usosActuales: number;
  maxUsosCliente?: number | null;
  active: boolean;
  products?: Array<{ product: { id: string; nombre: string } }>;
  createdAt: string;
}

export interface Coupon {
  id: string;
  codigo: string;
  promotionId?: string | null;
  tipo: 'PORCENTAJE' | 'MONTO_FIJO';
  valor: number;
  valorMaximo?: number | null;
  minCompra?: number | null;
  usosMaximos?: number | null;
  usosActuales: number;
  maxUsosCliente?: number | null;
  fechaExpiracion?: string | null;
  active: boolean;
  promotion?: { id: string; nombre: string } | null;
  _count?: { usages: number };
  createdAt: string;
}

export function listPromotions(token: string) {
  return apiGet<Promotion[]>('/promotions', token);
}

export function getPromotion(token: string, id: string) {
  return apiGet<Promotion>(`/promotions/${id}`, token);
}

export function createPromotion(token: string, data: Record<string, unknown>) {
  return apiPost<Promotion, Record<string, unknown>>('/promotions', data, token);
}

export function updatePromotion(token: string, id: string, data: Record<string, unknown>) {
  return apiPatch<Promotion, Record<string, unknown>>(`/promotions/${id}`, data, token);
}

export function deletePromotion(token: string, id: string) {
  return apiDelete<{ deleted: boolean }>(`/promotions/${id}`, token);
}

export function listCoupons(token: string) {
  return apiGet<Coupon[]>('/promotions/coupons/list', token);
}

export function createCoupon(token: string, data: Record<string, unknown>) {
  return apiPost<Coupon, Record<string, unknown>>('/promotions/coupons', data, token);
}

export function updateCoupon(token: string, id: string, data: Record<string, unknown>) {
  return apiPatch<Coupon, Record<string, unknown>>(`/promotions/coupons/${id}`, data, token);
}

export function deleteCoupon(token: string, id: string) {
  return apiDelete<{ deleted: boolean }>(`/promotions/coupons/${id}`, token);
}
