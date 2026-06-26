import { apiGet } from '@/services/api/client';

export interface BusinessTypePreset {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  categorias: string[];
  atributosProducto: string[];
  config: Record<string, unknown>;
  posConfig?: {
    mostrarMesas?: boolean;
    mostrarTiempoPreparacion?: boolean;
    metodosPago?: string[];
  };
  inventarioConfig?: {
    usarVariantes?: boolean;
    tipoVariantes?: string[];
    usarStockMinimo?: boolean;
  };
}

export function getBusinessTypes(token?: string) {
  return apiGet<BusinessTypePreset[]>('/business-types', token);
}

export function getBusinessType(id: string, token?: string) {
  return apiGet<BusinessTypePreset>(`/business-types/${id}`, token);
}

export const BUSINESS_TYPE_MAP: Record<string, BusinessTypePreset> = {};

export const TIPO_NEGOCIO_PRESETS = [
  { id: 'tienda', label: 'Tienda', desc: 'Abarrotes, miscelánea, aseo' },
  { id: 'zapateria', label: 'Zapatería', desc: 'Calzado, tenis, zapatos' },
  { id: 'restaurante', label: 'Restaurante', desc: 'Comidas, cafetería, bar' },
  { id: 'ferreteria', label: 'Ferretería', desc: 'Materiales, herramientas' },
  { id: 'farmacia', label: 'Farmacia', desc: 'Medicamentos, salud' },
];
