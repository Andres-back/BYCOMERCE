import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api/client';

export interface SuperadminStats {
  totalTenants: number;
  tenantsActivos: number;
  totalUsers: number;
  totalProducts: number;
  totalSales: number;
  totalOrders: number;
  pendingPayments: number;
  pendingPaymentsMonto: number;
}

export interface TenantListItem {
  id: string;
  nombre: string;
  slug: string;
  tipoNegocio: string;
  ciudad: string;
  estado: string;
  createdAt: string;
  plan: { id: string; nombre: string } | null;
  _count: { users: number; products: number; sales: number; orders: number };
  subscriptions: Array<{ estado: string; fechaFin: string; montoMensual: number }>;
}

export interface TenantListResponse {
  data: TenantListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TenantDetail {
  tenant: {
    id: string; nombre: string; slug: string; tipoNegocio: string;
    telefono: string | null; email: string | null; direccion: string | null;
    barrio: string | null; ciudad: string; estado: string;
    plan: { id: string; nombre: string; precio: number; limiteUsuarios: number; limiteProductos: number } | null;
    subscriptions: Array<{
      id: string; estado: string; fechaInicio: string; fechaFin: string;
      montoMensual: number; plan: { id: string; nombre: string };
    }>;
    businessSettings: Record<string, unknown> | null;
    deliveryConfig: Record<string, unknown> | null;
    _count: { users: number; products: number; sales: number; orders: number };
  };
  payments: Array<{
    id: string; monto: number; metodo: string; estado: string; createdAt: string;
  }>;
}

export interface PlanItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  limiteUsuarios: number;
  limiteProductos: number;
  almacenamientoGb: number;
  caracteristicas: string[];
  estado: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  metadata: unknown | null;
  createdAt: string;
  tenant: { id: string; nombre: string; slug: string } | null;
  user: { id: string; nombre: string; email: string } | null;
}

export interface AuditLogResponse {
  data: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export const superadminService = {
  stats: (token: string) => apiGet<SuperadminStats>('/superadmin/stats', token),
  
  listTenants: (token: string, params?: { q?: string; estado?: string; page?: number; pageSize?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.estado) search.set('estado', params.estado);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return apiGet<TenantListResponse>(`/superadmin/tenants${qs ? `?${qs}` : ''}`, token);
  },

  createTenant: (token: string, data: {
    nombre: string; slug: string; tipoNegocio: string; planId: string;
    adminNombre: string; adminEmail: string; adminPassword: string;
    telefono?: string; direccion?: string; barrio?: string; ciudad?: string;
    diasPrueba?: number;
  }) => apiPost<{ tenant: TenantDetail['tenant']; admin: { id: string; nombre: string; email: string }; password: string }>('/superadmin/tenants', data, token),

  getTenantDetail: (token: string, id: string) => apiGet<TenantDetail>(`/superadmin/tenants/${id}`, token),

  suspendTenant: (token: string, id: string, motivo?: string) =>
    apiPost<void, { motivo?: string }>(`/superadmin/tenants/${id}/suspend`, { motivo }, token),

  reactivateTenant: (token: string, id: string) =>
    apiPost<void, void>(`/superadmin/tenants/${id}/reactivate`, undefined as unknown as void, token),

  createUserForTenant: (token: string, tenantId: string, data: { nombre: string; email: string; rol: string; password?: string }) =>
    apiPost<{ user: { id: string; nombre: string; email: string; rol: string }; password: string }>(`/superadmin/tenants/${tenantId}/users`, data, token),

  getTenantProducts: (token: string, tenantId: string) =>
    apiGet<{ data: unknown[]; total: number }>(`/superadmin/tenants/${tenantId}/products`, token),

  getTenantOrders: (token: string, tenantId: string) =>
    apiGet<{ data: unknown[]; total: number }>(`/superadmin/tenants/${tenantId}/orders`, token),

  getTenantSales: (token: string, tenantId: string) =>
    apiGet<{ data: unknown[]; total: number }>(`/superadmin/tenants/${tenantId}/sales`, token),

  listPlans: (token: string, includeInactive = false) =>
    apiGet<PlanItem[]>(`/superadmin/plans${includeInactive ? '?includeInactive=true' : ''}`, token),

  createPlan: (token: string, data: {
    nombre: string; descripcion?: string; precio: number;
    limiteUsuarios: number; limiteProductos: number; almacenamientoGb?: number;
    caracteristicas?: string[];
  }) => apiPost<PlanItem>('/superadmin/plans', data, token),

  updatePlan: (token: string, id: string, data: Partial<{
    nombre: string; descripcion: string; precio: number;
    limiteUsuarios: number; limiteProductos: number; almacenamientoGb: number;
    caracteristicas: string[];
  }>) => apiPatch<PlanItem, typeof data>(`/superadmin/plans/${id}`, data, token),

  deletePlan: (token: string, id: string) => apiDelete<PlanItem>(`/superadmin/plans/${id}`, token),

  payments: (token: string, page = 1, pageSize = 50) =>
    apiGet<{ data: unknown[]; total: number }>(`/superadmin/payments?page=${page}&pageSize=${pageSize}`, token),

  confirmPayment: (token: string, id: string, observaciones?: string) =>
    apiPost<unknown, { observaciones?: string }>(`/superadmin/payments/${id}/confirm`, { observaciones }, token),

  rejectPayment: (token: string, id: string, motivo?: string) =>
    apiPost<unknown, { motivo?: string }>(`/superadmin/payments/${id}/reject`, { motivo }, token),

  impersonate: (token: string, userId: string) =>
    apiPost<{ authenticated: true; user: { id: string; nombre: string; email: string; rol: string } }, { userId: string }>('/auth/impersonate', { userId }, token),

  auditLogs: (token: string, params?: { tenantId?: string; accion?: string; page?: number; pageSize?: number }) => {
    const search = new URLSearchParams();
    if (params?.tenantId) search.set('tenantId', params.tenantId);
    if (params?.accion) search.set('accion', params.accion);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return apiGet<AuditLogResponse>(`/superadmin/audit-logs${qs ? `?${qs}` : ''}`, token);
  },
};
