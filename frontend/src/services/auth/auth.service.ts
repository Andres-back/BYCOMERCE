import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api/client';

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    tenantId: string | null;
    isSuperAdmin: boolean;
  };
  expiresIn: number;
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
  me: (token: string) => apiGet<AuthUser>('/auth/me', token),
};