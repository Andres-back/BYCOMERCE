import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api/client';
import { CustomerListResponse, CustomerProfile, CustomerWithStats } from '@/types/api';

export interface CustomerFilters {
  q?: string;
  segment?: 'TODOS' | 'NUEVO' | 'FRECUENTE' | 'VIP' | 'INACTIVO';
  page?: number;
  pageSize?: number;
}

export interface CustomerInput {
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  observaciones?: string;
}

function toQuery(filters?: CustomerFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.segment && filters.segment !== 'TODOS') params.set('segment', filters.segment);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function listCustomers(token: string, filters?: CustomerFilters) {
  return apiGet<CustomerListResponse>(`/customers${toQuery(filters)}`, token);
}

export function getCustomer(token: string, id: string) {
  return apiGet<CustomerProfile>(`/customers/${id}`, token);
}

export function createCustomer(token: string, input: CustomerInput) {
  return apiPost<CustomerWithStats, CustomerInput>('/customers', input, token);
}

export function updateCustomer(token: string, id: string, input: Partial<CustomerInput>) {
  return apiPatch<CustomerWithStats, Partial<CustomerInput>>(`/customers/${id}`, input, token);
}

export function deleteCustomer(token: string, id: string) {
  return apiDelete<{ id: string; deleted: boolean }>(`/customers/${id}`, token);
}
