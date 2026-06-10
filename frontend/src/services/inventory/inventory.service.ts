import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api/client';
import { Category, InventoryMovement, InventoryMovementType, Product } from '@/types/api';

export interface CreateCategoryInput {
  nombre: string;
  descripcion?: string;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface CreateProductInput {
  nombre: string;
  precio: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  categoryId?: string;
  sku?: string;
  barcode?: string;
  marca?: string;
  descripcion?: string;
  imagenPrincipal?: string;
  destacado?: boolean;
}

export type UpdateProductInput = Omit<Partial<CreateProductInput>, 'stock'>;

export interface ProductFilters {
  q?: string;
  categoryId?: string;
  stockStatus?: 'available' | 'low' | 'out' | 'all';
}

export interface AdjustStockInput {
  tipo: InventoryMovementType;
  cantidad?: number;
  stockNuevo?: number;
  observacion?: string;
}

export interface ImportProductInput {
  categoryId?: string;
  categoryName?: string;
  nombre: string;
  precio: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  sku?: string;
  barcode?: string;
  marca?: string;
  descripcion?: string;
  imagenPrincipal?: string;
  destacado?: boolean;
}

export interface ImportProductsResult {
  created: Array<{ id: string; nombre: string; sku?: string | null }>;
  skipped: Array<{ row: number; nombre?: string; reason: string }>;
}

export interface ExportProductsResult {
  filename: string;
  contentType: string;
  csv: string;
  rows: Array<Record<string, string | number>>;
}

function productQuery(filters?: ProductFilters) {
  const params = new URLSearchParams();
  if (filters?.q) params.set('q', filters.q);
  if (filters?.categoryId && filters.categoryId !== 'all') params.set('categoryId', filters.categoryId);
  if (filters?.stockStatus && filters.stockStatus !== 'all') params.set('stockStatus', filters.stockStatus);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function listCategories(token: string) {
  return apiGet<Category[]>('/categories', token);
}

export function createCategory(token: string, input: CreateCategoryInput) {
  return apiPost<Category, CreateCategoryInput>('/categories', input, token);
}

export function updateCategory(token: string, id: string, input: UpdateCategoryInput) {
  return apiPatch<Category, UpdateCategoryInput>(`/categories/${id}`, input, token);
}

export function deleteCategory(token: string, id: string) {
  return apiDelete<Category>(`/categories/${id}`, token);
}

export function listProducts(token: string, filters?: ProductFilters) {
  return apiGet<Product[]>(`/products${productQuery(filters)}`, token);
}

export function exportProducts(token: string, filters?: ProductFilters) {
  return apiGet<ExportProductsResult>(`/products/export${productQuery(filters)}`, token);
}

export function importProducts(token: string, products: ImportProductInput[]) {
  return apiPost<ImportProductsResult, { products: ImportProductInput[] }>('/products/import', { products }, token);
}

export function createProduct(token: string, input: CreateProductInput) {
  return apiPost<Product, CreateProductInput>('/products', input, token);
}

export function updateProduct(token: string, id: string, input: UpdateProductInput) {
  return apiPatch<Product, UpdateProductInput>(`/products/${id}`, input, token);
}

export function deleteProduct(token: string, id: string) {
  return apiDelete<Product>(`/products/${id}`, token);
}

export function duplicateProduct(token: string, id: string) {
  return apiPost<Product, Record<string, never>>(`/products/${id}/duplicate`, {}, token);
}

export function listProductMovements(token: string, id: string) {
  return apiGet<InventoryMovement[]>(`/products/${id}/movements`, token);
}

export function adjustProductStock(token: string, id: string, input: AdjustStockInput) {
  return apiPost<{ product: Product; movement: InventoryMovement }, AdjustStockInput>(`/products/${id}/adjust-stock`, input, token);
}
