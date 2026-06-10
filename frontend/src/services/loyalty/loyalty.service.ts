import { apiGet, apiPatch, apiPost } from '@/services/api/client';

export interface LoyaltyProgram {
  id: string;
  activo: boolean;
  puntosPorPeso: number;
  pesoPorPunto: number;
  expiracionDias: number;
  puntosBienvenida: number;
  tiers: LoyaltyTier[];
  rules: LoyaltyRule[];
}

export interface LoyaltyTier {
  id: string;
  nombre: string;
  nivel: number;
  color: string;
  multiplicador: number;
  puntosMinimos: number;
}

export interface LoyaltyReward {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: string;
  valor: number;
  puntosNecesarios: number;
  stock: number;
  imagen?: string;
  activo: boolean;
}

export interface LoyaltyRule {
  id: string;
  tipo: string;
  valor: number;
  activo: boolean;
}

export function getProgram(token: string) {
  return apiGet<LoyaltyProgram>('/loyalty/program', token);
}

export function updateProgram(token: string, data: Partial<LoyaltyProgram>) {
  return apiPatch<LoyaltyProgram, Partial<LoyaltyProgram>>('/loyalty/program', data, token);
}

export function getTiers(token: string) {
  return apiGet<LoyaltyTier[]>('/loyalty/tiers', token);
}

export function createTier(token: string, data: Partial<LoyaltyTier>) {
  return apiPost<LoyaltyTier, Partial<LoyaltyTier>>('/loyalty/tiers', data, token);
}

export function updateTier(token: string, id: string, data: Partial<LoyaltyTier>) {
  return apiPatch<LoyaltyTier, Partial<LoyaltyTier>>(`/loyalty/tiers/${id}`, data, token);
}

export function getRewards(token: string) {
  return apiGet<LoyaltyReward[]>('/loyalty/rewards', token);
}

export function createReward(token: string, data: Partial<LoyaltyReward>) {
  return apiPost<LoyaltyReward, Partial<LoyaltyReward>>('/loyalty/rewards', data, token);
}

export function updateReward(token: string, id: string, data: Partial<LoyaltyReward>) {
  return apiPatch<LoyaltyReward, Partial<LoyaltyReward>>(`/loyalty/rewards/${id}`, data, token);
}

export function getCustomerPoints(token: string, customerId: string) {
  return apiGet<{ totalPuntos: number; tier: LoyaltyTier | null }>(`/loyalty/customers/${customerId}`, token);
}
