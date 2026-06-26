'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

if (typeof window !== 'undefined') {
  localStorage.removeItem('mocoa_access_token');
  localStorage.removeItem('mocoa_refresh_token');
  localStorage.removeItem('mocoa-auth');
}

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
  setSession: (user: AuthUser) => void;
  clearSession: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setSession: (user) => {
        set({ token: 'cookie-session', user, isAuthenticated: true });
      },
      clearSession: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'mocoa-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.isAuthenticated ? 'cookie-session' : null,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
