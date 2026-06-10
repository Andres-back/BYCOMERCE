'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import {
  listCashRegisters,
  getCurrentCashRegister,
  openCashRegister,
  closeCashRegister,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  createCashMovement,
} from '@/services/finance/finance.service';
import type { ExpenseFilters } from '@/services/finance/finance.service';
import type { CashMovementType } from '@/types/api';

function useToken() {
  return useAuthStore((s) => s.token);
}

export function useCashRegisters() {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.cashRegisters.all,
    queryFn: () => listCashRegisters(token!),
    enabled: !!token,
  });
}

export function useCurrentCashRegister() {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.cashRegisters.current,
    queryFn: () => getCurrentCashRegister(token!),
    enabled: !!token,
  });
}

export function useOpenCashRegister() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { saldoInicial: number }) => openCashRegister(token!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cashRegisters.all });
      qc.invalidateQueries({ queryKey: queryKeys.cashRegisters.current });
    },
  });
}

export function useCloseCashRegister() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { saldoFinal: number; observacion?: string } }) =>
      closeCashRegister(token!, id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cashRegisters.all });
      qc.invalidateQueries({ queryKey: queryKeys.cashRegisters.current });
    },
  });
}

export function useCreateCashMovement() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cashRegisterId, input }: { cashRegisterId: string; input: { tipo: Extract<CashMovementType, 'INGRESO_MANUAL' | 'AJUSTE' | 'RETIRO'>; monto: number; descripcion?: string } }) =>
      createCashMovement(token!, cashRegisterId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cashRegisters.all });
      qc.invalidateQueries({ queryKey: queryKeys.cashRegisters.current });
    },
  });
}

export function useExpenses(filters?: ExpenseFilters) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.expenses.all(filters as Record<string, unknown> | undefined),
    queryFn: () => listExpenses(token!, filters),
    enabled: !!token,
  });
}

export function useCreateExpense() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { categoria: string; descripcion: string; valor: number; comprobanteUrl?: string; fecha?: string }) =>
      createExpense(token!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useUpdateExpense() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<{ categoria: string; descripcion: string; valor: number; comprobanteUrl?: string }> }) =>
      updateExpense(token!, id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}