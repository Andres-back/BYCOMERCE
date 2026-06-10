import { apiGet, apiPatch, apiPost } from '@/services/api/client';

export interface TenantBranch {
  id: string;
  nombre: string;
  codigo?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  barrio?: string | null;
  ciudad: string;
  latitud?: number | null;
  longitud?: number | null;
  horarioInicio?: string | null;
  horarioFin?: string | null;
  esPrincipal: boolean;
  estado: string;
  createdAt: string;
}

export function listBranches(token: string) {
  return apiGet<TenantBranch[]>('/branches', token);
}

export function getBranch(token: string, id: string) {
  return apiGet<TenantBranch>(`/branches/${id}`, token);
}

export function createBranch(token: string, data: Partial<TenantBranch>) {
  return apiPost<TenantBranch, Partial<TenantBranch>>('/branches', data, token);
}

export function updateBranch(token: string, id: string, data: Partial<TenantBranch>) {
  return apiPatch<TenantBranch, Partial<TenantBranch>>(`/branches/${id}`, data, token);
}

export function deactivateBranch(token: string, id: string) {
  return apiPost<void, void>(`/branches/${id}/deactivate`, undefined as unknown as void, token);
}

export function activateBranch(token: string, id: string) {
  return apiPost<void, void>(`/branches/${id}/activate`, undefined as unknown as void, token);
}
