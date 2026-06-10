import { apiGet } from '@/services/api/client';
import {
  CustomersReport,
  DashboardReport,
  InventoryReport,
  ProductsReport,
  SalesReport,
} from '@/types/api';

export interface ReportFilters {
  from?: string;
  to?: string;
}

function toQuery(filters?: ReportFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getDashboardReport(token: string, filters?: ReportFilters) {
  return apiGet<DashboardReport>(`/reports/dashboard${toQuery(filters)}`, token);
}

export function getSalesReport(token: string, filters?: ReportFilters) {
  return apiGet<SalesReport>(`/reports/sales${toQuery(filters)}`, token);
}

export function getProductsReport(token: string, filters?: ReportFilters) {
  return apiGet<ProductsReport>(`/reports/products${toQuery(filters)}`, token);
}

export function getInventoryReport(token: string) {
  return apiGet<InventoryReport>('/reports/inventory', token);
}

export function getCustomersReport(token: string, filters?: ReportFilters) {
  return apiGet<CustomersReport>(`/reports/customers${toQuery(filters)}`, token);
}
