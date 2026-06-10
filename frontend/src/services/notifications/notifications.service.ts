import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api/client';

export interface NotificationItem {
  id: string;
  tenantId: string;
  userId?: string | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  level: string;
  data?: Record<string, unknown> | null;
  leida: boolean;
  leidaAt?: string | null;
  actionUrl?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NotificationPreference {
  tipo: string;
  titulo: string;
  canales: string[];
  activo: boolean;
}

export interface NotificationTemplate {
  id: string;
  tenantId: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  canales: string[];
  criticidad: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listNotifications(token: string, page = 1, pageSize = 50) {
  const result = await apiGet<NotificationListResponse>(`/notifications?page=${page}&pageSize=${pageSize}`, token);
  return result.data;
}

export async function getUnreadCount(token: string) {
  return apiGet<{ count: number }>('/notifications/unread-count', token).then(r => r.count);
}

export async function markAsRead(token: string, id: string) {
  return apiPost<NotificationItem, void>(`/notifications/${id}/read`, undefined as unknown as void, token);
}

export async function markAllAsRead(token: string) {
  return apiPost<void, void>('/notifications/read-all', undefined as unknown as void, token);
}

export async function deleteNotification(token: string, id: string) {
  return apiDelete<void>(`/notifications/${id}`, token);
}

export async function getPreferences(token: string) {
  return apiGet<NotificationPreference[]>('/notifications/preferences', token);
}

export async function updatePreferences(token: string, data: { preferencias: { tipo: string; canal: string; activo: boolean }[] }) {
  return apiPatch<NotificationPreference[], { preferencias: { tipo: string; canal: string; activo: boolean }[] }>('/notifications/preferences', data, token);
}

export async function getTemplates(token: string) {
  return apiGet<NotificationTemplate[]>('/notifications/templates', token);
}

export async function createTemplate(token: string, data: Partial<NotificationTemplate>) {
  return apiPost<NotificationTemplate, Partial<NotificationTemplate>>('/notifications/templates', data, token);
}

export async function updateTemplate(token: string, id: string, data: Partial<NotificationTemplate>) {
  return apiPatch<NotificationTemplate, Partial<NotificationTemplate>>(`/notifications/templates/${id}`, data, token);
}
