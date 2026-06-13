import type { ProductFilters } from '@/services/inventory/inventory.service';

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  products: {
    all: (filters?: ProductFilters) => ['products', filters] as const,
    detail: (id: string) => ['products', id] as const,
    movements: (id: string) => ['product-movements', id] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  sales: {
    all: ['pos-sales'] as const,
    detail: (id: string) => ['pos-sales', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    detail: (id: string) => ['orders', id] as const,
  },
  customers: {
    all: (filters?: Record<string, unknown>) => ['customers', filters] as const,
    detail: (id: string) => ['customers', id] as const,
    history: (id: string) => ['customers', id, 'history'] as const,
  },
  cashRegisters: {
    all: ['cash-registers'] as const,
    current: ['cash-registers', 'current'] as const,
    detail: (id: string) => ['cash-registers', id] as const,
    movements: (id: string) => ['cash-registers', id, 'movements'] as const,
  },
  expenses: {
    all: (filters?: Record<string, unknown>) => ['expenses', filters] as const,
  },
  users: {
    all: (filters?: Record<string, unknown>) => ['users', filters] as const,
    detail: (id: string) => ['users', id] as const,
  },
  purchases: {
    all: (filters?: Record<string, unknown>) => ['purchases', filters] as const,
    detail: (id: string) => ['purchases', id] as const,
  },
  suppliers: {
    all: (filters?: Record<string, unknown>) => ['suppliers', filters] as const,
  },
  reports: {
    dashboard: (filters?: Record<string, unknown>) => ['dashboard', filters] as const,
    sales: (filters?: Record<string, unknown>) => ['reports', 'sales', filters] as const,
    products: (filters?: Record<string, unknown>) => ['reports', 'products', filters] as const,
    inventory: ['reports', 'inventory'] as const,
    customers: (filters?: Record<string, unknown>) => ['reports', 'customers', filters] as const,
  },
  tenant: {
    profile: ['tenant', 'profile'] as const,
    settings: ['tenant', 'settings'] as const,
    aiSettings: ['tenant', 'ai-settings'] as const,
    gallery: ['tenant', 'gallery'] as const,
    subscription: ['tenant', 'subscription'] as const,
    payments: ['tenant', 'payments'] as const,
  },
  plans: {
    all: ['plans'] as const,
    detail: (id: string) => ['plans', id] as const,
  },
  marketplace: {
    businesses: ['marketplace', 'businesses'] as const,
    business: (slug: string) => ['marketplace', slug] as const,
    products: (slug: string) => ['marketplace', slug, 'products'] as const,
    featured: ['marketplace', 'featured'] as const,
  },
  promotions: {
    all: ['promotions'] as const,
    detail: (id: string) => ['promotions', id] as const,
  },
  coupons: {
    all: ['coupons'] as const,
    detail: (id: string) => ['coupons', id] as const,
  },
  branches: {
    all: ['branches'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (page?: number) => ['notifications', 'list', page] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
    preferences: ['notifications', 'preferences'] as const,
    templates: ['notifications', 'templates'] as const,
  },
};
