'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setSession: (token, user) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('mocoa_access_token', token);
          document.cookie = `mocoa-auth=${token}; path=/; max-age=86400; SameSite=Lax`;
        }
        set({ token, user, isAuthenticated: true });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('mocoa_access_token');
          document.cookie = 'mocoa-auth=; path=/; max-age=0';
        }
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'mocoa-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);