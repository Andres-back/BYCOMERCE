'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth/auth.service';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    let cancelled = false;
    authService.me(token).then((user) => {
      if (!cancelled) setSession(user);
    }).catch(() => {
      if (!cancelled) {
        clearSession();
        router.replace('/auth/login');
      }
    });

    return () => { cancelled = true; };
  }, [token]);

  if (!isAuthenticated || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
