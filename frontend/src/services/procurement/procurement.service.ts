import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api/client';
import { Purchase, Supplier } from '@/types/api';

export interface SupplierInput {
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  observaciones?: string;
}

export interface PurchaseItemInput {
  productId: string;
  cantidad: number;
  costoUnitario: number;
}

export interface CreatePurchaseInput {
  supplierId?: string;
  numeroFactura?: string;
  fechaCompra?: string;
  observaciones?: string;
  items: PurchaseItemInput[];
}

export interface PurchaseFilters {
  supplierId?: string;
  from?: string;
  to?: string;
}

function purchaseQuery(filters?: PurchaseFilters) {
  const params = new URLSearchParams();
  if (filters?.supplierId && filters.supplierId !== 'all') params.set('supplierId', filters.supplierId);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function listSuppliers(token: string, q?: string) {
  return apiGet<Supplier[]>(`/suppliers${q ? `?q=${encodeURIComponent(q)}` : ''}`, token);
}

export function createSupplier(token: string, input: SupplierInput) {
  return apiPost<Supplier, SupplierInput>('/suppliers', input, token);
}

export function updateSupplier(token: string, id: string, input: Partial<SupplierInput>) {
  return apiPatch<Supplier, Partial<SupplierInput>>(`/suppliers/${id}`, input, token);
}

export function deleteSupplier(token: string, id: string) {
  return apiDelete<Supplier>(`/suppliers/${id}`, token);
}

export function listPurchases(token: string, filters?: PurchaseFilters) {
  return apiGet<Purchase[]>(`/purchases${purchaseQuery(filters)}`, token);
}

export function getPurchase(token: string, id: string) {
  return apiGet<Purchase>(`/purchases/${id}`, token);
}

export function createPurchase(token: string, input: CreatePurchaseInput) {
  return apiPost<Purchase, CreatePurchaseInput>('/purchases', input, token);
}

export function cancelPurchase(token: string, id: string) {
  return apiPost<Purchase, Record<string, never>>(`/purchases/${id}/cancel`, {}, token);
}
