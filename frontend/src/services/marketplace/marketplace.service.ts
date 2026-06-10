import { apiGet } from '@/services/api/client';
import { Business, Product } from '@/types/api';

export function listBusinesses() {
  return apiGet<Business[]>('/public/businesses');
}

export function getBusiness(slug: string) {
  return apiGet<Business>(`/public/businesses/${slug}`);
}

export function listBusinessProducts(slug: string) {
  return apiGet<Product[]>(`/public/businesses/${slug}/products`);
}

export function listFeaturedProducts() {
  return apiGet<Product[]>('/public/featured-products');
}
