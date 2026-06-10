import { apiGet, apiPost } from '@/services/api/client';
import { PaymentMethod, Sale, SaleRefund } from '@/types/api';

export interface CreateSaleItemInput {
  productId: string;
  cantidad: number;
}

export interface CreateSaleInput {
  customerId?: string;
  customer?: {
    nombre: string;
    telefono: string;
    email?: string;
    direccion?: string;
  };
  items: CreateSaleItemInput[];
  descuento?: number;
  metodoPago: PaymentMethod;
  montoRecibido?: number;
  referenciaExterna?: string;
}

export interface VoidSaleInput {
  motivo?: string;
}

export interface RefundSaleInput {
  motivo: string;
  items: Array<{
    saleItemId: string;
    cantidad: number;
  }>;
}

export function listSales(token: string) {
  return apiGet<Sale[]>('/sales', token);
}

export function getSale(token: string, id: string) {
  return apiGet<Sale>(`/sales/${id}`, token);
}

export function createSale(token: string, input: CreateSaleInput) {
  return apiPost<Sale, CreateSaleInput>('/sales', input, token);
}

export function voidSale(token: string, id: string, input: VoidSaleInput) {
  return apiPost<Sale, VoidSaleInput>(`/sales/${id}/void`, input, token);
}

export function refundSale(token: string, id: string, input: RefundSaleInput) {
  return apiPost<SaleRefund, RefundSaleInput>(`/sales/${id}/refund`, input, token);
}
