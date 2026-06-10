'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import {
  getDashboardReport,
  getSalesReport,
  getProductsReport,
  getInventoryReport,
  getCustomersReport,
} from '@/services/reports/reports.service';
import type { ReportFilters } from '@/services/reports/reports.service';

function useToken() {
  return useAuthStore((s) => s.token);
}

export function useDashboardReport(filters?: ReportFilters) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.reports.dashboard(filters as Record<string, unknown> | undefined),
    queryFn: () => getDashboardReport(token!, filters),
    enabled: !!token,
  });
}

export function useSalesReport(filters?: ReportFilters) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.reports.sales(filters as Record<string, unknown> | undefined),
    queryFn: () => getSalesReport(token!, filters),
    enabled: !!token,
  });
}

export function useProductsReport(filters?: ReportFilters) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.reports.products(filters as Record<string, unknown> | undefined),
    queryFn: () => getProductsReport(token!, filters),
    enabled: !!token,
  });
}

export function useInventoryReport() {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.reports.inventory,
    queryFn: () => getInventoryReport(token!),
    enabled: !!token,
  });
}

export function useCustomersReport(filters?: ReportFilters) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.reports.customers(filters as Record<string, unknown> | undefined),
    queryFn: () => getCustomersReport(token!, filters),
    enabled: !!token,
  });
}