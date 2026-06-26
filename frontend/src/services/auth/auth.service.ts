import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api/client';

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface LoginResponse {
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    tenantId: string | null;
    isSuperAdmin: boolean;
  };
  expiresIn: number;
  authenticated: true;
}

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
}

export const authService = {
  login: (data: LoginRequest) => apiPost<LoginResponse, LoginRequest>('/auth/login', data),
  refresh: () => apiPost<LoginResponse, Record<string, never>>('/auth/refresh', {}),
  logout: () => apiPost<{ ok: true }, Record<string, never>>('/auth/logout', {}),
  me: (_token?: string) => apiGet<AuthUser>('/auth/me'),
};
