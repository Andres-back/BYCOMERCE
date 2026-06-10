import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api/client';
import { Business, BusinessImage } from '@/types/api';

export interface UpdateBusinessProfileInput {
  nombre?: string;
  tipoNegocio?: string;
  telefono?: string;
  whatsapp?: string;
  email?: string;
  direccion?: string;
  barrio?: string;
  latitud?: number;
  longitud?: number;
  logo?: string;
  banner?: string;
  eslogan?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  sitioWeb?: string;
  colorPrimario?: string;
  colorSecundario?: string;
  colorAcento?: string;
  fuente?: string;
  modoTema?: 'CLARO' | 'OSCURO' | 'AUTO';
  radioTarjeta?: 'NINGUNO' | 'PEQUENO' | 'MEDIO' | 'GRANDE' | 'COMPLETO';
  mostrarPrecios?: boolean;
  mostrarStock?: boolean;
  textoBienvenida?: string;
  deliveryActivo?: boolean;
  deliveryCostoBase?: number;
  deliveryRadioKm?: number;
  deliveryHorarioInicio?: string;
  deliveryHorarioFin?: string;
}

export interface CreateBusinessImageInput {
  url: string;
  titulo?: string;
  descripcion?: string;
  orden?: number;
}

export interface UpdateBusinessImageInput {
  titulo?: string;
  descripcion?: string;
  orden?: number;
}

export function getBusinessProfile(token: string) {
  return apiGet<Business>('/tenant/profile', token);
}

export function updateBusinessProfile(token: string, input: UpdateBusinessProfileInput) {
  return apiPatch<Business, UpdateBusinessProfileInput>('/tenant/profile', input, token);
}

export function listGallery(token: string) {
  return apiGet<BusinessImage[]>('/tenants/me/gallery', token);
}

export function addGalleryImage(token: string, input: CreateBusinessImageInput) {
  return apiPost<BusinessImage, CreateBusinessImageInput>('/tenants/me/gallery', input, token);
}

export function updateGalleryImage(token: string, id: string, input: UpdateBusinessImageInput) {
  return apiPatch<BusinessImage, UpdateBusinessImageInput>(`/tenants/me/gallery/${id}`, input, token);
}

export function deleteGalleryImage(token: string, id: string) {
  return apiDelete<{ deleted: boolean; id: string }>(`/tenants/me/gallery/${id}`, token);
}

export function reorderGallery(token: string, ids: string[]) {
  return apiPost<BusinessImage[], { ids: string[] }>('/tenants/me/gallery/reorder', { ids }, token);
}
