import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api/client';

export interface InviteUserInput {
  nombre: string;
  email: string;
  rol: string;
  temporaryPassword?: string;
}

export interface UpdateUserInput {
  nombre?: string;
  email?: string;
  rol?: string;
  newPassword?: string;
}

export interface UserItem {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  createdAt: string;
}

export const userService = {
  list: (token: string, filters?: Record<string, string>) => {
    const params = new URLSearchParams(filters).toString();
    return apiGet<{ data: UserItem[] }>(`/users${params ? `?${params}` : ''}`, token);
  },
  invite: (token: string, data: InviteUserInput) => apiPost<UserItem, InviteUserInput>('/users/invite', data, token),
  get: (token: string, id: string) => apiGet<UserItem>(`/users/${id}`, token),
  update: (token: string, id: string, data: UpdateUserInput) => apiPatch<UserItem, UpdateUserInput>(`/users/${id}`, data, token),
  deactivate: (token: string, id: string) => apiPost<UserItem, void>(`/users/${id}/deactivate`, undefined as unknown as void, token),
  activate: (token: string, id: string) => apiPost<UserItem, void>(`/users/${id}/activate`, undefined as unknown as void, token),
  delete: (token: string, id: string) => apiDelete<void>(`/users/${id}`, token),
};