'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '@/services/customers/customers.service';
import type { CustomerInput } from '@/services/customers/customers.service';

export function useCustomers(token: string, page: number, q?: string, segment?: string) {
  return useQuery({
    queryKey: queryKeys.customers.all({ page, q, segment }),
    queryFn: () =>
      listCustomers(token, {
        page,
        pageSize: 20,
        q: q || undefined,
        segment: segment === 'TODOS' ? undefined : (segment as 'NUEVO' | 'FRECUENTE' | 'VIP' | 'INACTIVO' | undefined),
      }),
    enabled: !!token,
  });
}

export function useCustomer(token: string, id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => getCustomer(token, id),
    enabled: !!token && !!id,
  });
}

export function useCreateCustomer(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) => createCustomer(token, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente creado');
    },
    onError: () => toast.error('No fue posible crear el cliente'),
  });
}

export function useUpdateCustomer(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CustomerInput> }) =>
      updateCustomer(token, id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente actualizado');
    },
    onError: () => toast.error('No fue posible actualizar el cliente'),
  });
}

export function useDeleteCustomer(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCustomer(token, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente eliminado');
    },
    onError: () => toast.error('No fue posible eliminar el cliente'),
  });
}

export function useCustomerHistory(token: string, id: string) {
  return useQuery({
    queryKey: queryKeys.customers.history(id),
    queryFn: () => getCustomer(token, id),
    enabled: !!token && !!id,
  });
}