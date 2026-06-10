'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import {
  listPurchases,
  getPurchase,
  createPurchase,
  cancelPurchase,
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '@/services/procurement/procurement.service';
import type { PurchaseFilters, SupplierInput } from '@/services/procurement/procurement.service';

function useToken() {
  return useAuthStore((s) => s.token);
}

export function usePurchases(filters?: PurchaseFilters) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.purchases.all(filters as Record<string, unknown> | undefined),
    queryFn: () => listPurchases(token!, filters),
    enabled: !!token,
  });
}

export function usePurchase(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.purchases.detail(id),
    queryFn: () => getPurchase(token!, id),
    enabled: !!token && !!id,
  });
}

export function useCreatePurchase() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createPurchase>[1]) => createPurchase(token!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}

export function useCancelPurchase() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelPurchase(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}

export function useSuppliers(q?: string) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.suppliers.all({ q } as Record<string, unknown>),
    queryFn: () => listSuppliers(token!, q || undefined),
    enabled: !!token,
  });
}

export function useCreateSupplier() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SupplierInput) => createSupplier(token!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplier() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SupplierInput> }) =>
      updateSupplier(token!, id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useDeleteSupplier() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSupplier(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}