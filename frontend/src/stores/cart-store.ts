import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, cantidad: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, cantidad: i.cantidad + item.cantidad }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, cantidad) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, cantidad: Math.max(1, cantidad) } : i,
          ),
        })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.precio * i.cantidad, 0),
      count: () => get().items.reduce((sum, i) => sum + i.cantidad, 0),
    }),
    {
      name: 'mocoa-cart',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
