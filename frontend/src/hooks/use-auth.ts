import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth/auth.service';

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  async function logout() {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    setSession,
    logout,
    role: user?.rol ?? null,
    tenantId: user?.tenantId ?? null,
    isSuperAdmin: user?.isSuperAdmin ?? false,
    isAdmin: user?.rol === 'ADMIN_NEGOCIO',
    isSupervisor: user?.rol === 'SUPERVISOR',
    isCajero: user?.rol === 'CAJERO',
    canManageUsers: user?.rol === 'ADMIN_NEGOCIO',
    canManageProducts: user?.rol === 'ADMIN_NEGOCIO',
    canManageSettings: user?.rol === 'ADMIN_NEGOCIO',
    canVoidSales: user?.rol === 'ADMIN_NEGOCIO' || user?.rol === 'SUPERVISOR',
    canExport: user?.rol === 'ADMIN_NEGOCIO' || user?.rol === 'SUPERVISOR',
  };
}
