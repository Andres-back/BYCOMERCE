'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import {
  listSales,
  getSale,
  createSale,
  voidSale,
  refundSale,
  type CreateSaleInput,
  type RefundSaleInput,
} from '@/services/pos/pos.service';

function useToken() {
  return useAuthStore((s) => s.token);
}

export function useSales() {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.sales.all,
    queryFn: () => listSales(token!),
    enabled: !!token,
  });
}

export function useSaleDetail(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.sales.detail(id),
    queryFn: () => getSale(token!, id),
    enabled: !!token && !!id,
  });
}

export function useCreateSale() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => createSale(token!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useVoidSale() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      voidSale(token!, id, { motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useRefundSale() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RefundSaleInput }) =>
      refundSale(token!, id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}