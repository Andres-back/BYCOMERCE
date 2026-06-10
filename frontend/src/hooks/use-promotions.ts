'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import {
  listPromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '@/services/promotions/promotions.service';

export function usePromotions(token: string) {
  return useQuery({
    queryKey: queryKeys.promotions.all,
    queryFn: () => listPromotions(token),
    enabled: !!token,
  });
}

export function usePromotion(token: string, id: string) {
  return useQuery({
    queryKey: queryKeys.promotions.detail(id),
    queryFn: () => getPromotion(token, id),
    enabled: !!token && !!id,
  });
}

export function useCreatePromotion(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createPromotion(token, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoción creada');
    },
    onError: () => toast.error('No fue posible crear la promoción'),
  });
}

export function useUpdatePromotion(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updatePromotion(token, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoción actualizada');
    },
    onError: () => toast.error('No fue posible actualizar la promoción'),
  });
}

export function useDeletePromotion(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePromotion(token, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoción eliminada');
    },
    onError: () => toast.error('No fue posible eliminar la promoción'),
  });
}

export function useCoupons(token: string) {
  return useQuery({
    queryKey: queryKeys.coupons.all,
    queryFn: () => listCoupons(token),
    enabled: !!token,
  });
}

export function useCreateCoupon(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createCoupon(token, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupón creado');
    },
    onError: () => toast.error('No fue posible crear el cupón'),
  });
}

export function useUpdateCoupon(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateCoupon(token, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupón actualizado');
    },
    onError: () => toast.error('No fue posible actualizar el cupón'),
  });
}

export function useDeleteCoupon(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCoupon(token, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupón eliminado');
    },
    onError: () => toast.error('No fue posible eliminar el cupón'),
  });
}
