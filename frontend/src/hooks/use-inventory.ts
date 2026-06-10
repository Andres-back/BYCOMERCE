'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import {
  listProducts, listCategories, listProductMovements,
  createProduct, updateProduct, deleteProduct, duplicateProduct,
  adjustProductStock, createCategory, updateCategory, deleteCategory,
  exportProducts, importProducts,
  type ProductFilters, type CreateProductInput, type AdjustStockInput,
  type CreateCategoryInput, type ImportProductInput,
} from '@/services/inventory/inventory.service';

function useToken() {
  return useAuthStore((s) => s.token);
}

export function useProducts(filters: ProductFilters) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.products.all(filters),
    queryFn: () => listProducts(token!, filters),
    enabled: !!token,
  });
}

export function useCategories() {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => listCategories(token!),
    enabled: !!token,
  });
}

export function useProductMovements(productId: string | undefined) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.products.movements(productId!),
    queryFn: () => listProductMovements(token!, productId!),
    enabled: !!token && !!productId,
  });
}

export function useCreateProduct() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(token!, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); },
  });
}

export function useUpdateProduct() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateProductInput> }) =>
      updateProduct(token!, id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); },
  });
}

export function useDeleteProduct() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(token!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); },
  });
}

export function useDuplicateProduct() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duplicateProduct(token!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); },
  });
}

export function useAdjustStock() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdjustStockInput }) =>
      adjustProductStock(token!, id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-movements'] });
    },
  });
}

export function useCreateCategory() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(token!, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); },
  });
}

export function useUpdateCategory() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateCategoryInput }) =>
      updateCategory(token!, id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); },
  });
}

export function useDeleteCategory() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(token!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); },
  });
}

export function useExportProducts() {
  const token = useToken();
  return useMutation({
    mutationFn: (filters: ProductFilters) => exportProducts(token!, filters),
  });
}

export function useImportProducts() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (products: ImportProductInput[]) => importProducts(token!, products),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); },
  });
}