'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import { getBusinessProfile } from '@/services/tenant/tenant.service';
import type { Business } from '@/types/api';

interface BrandingContextValue {
  business: Business | null;
  isLoading: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  font: string;
  theme: 'CLARO' | 'OSCURO' | 'AUTO';
  radius: 'NINGUNO' | 'PEQUENO' | 'MEDIO' | 'GRANDE' | 'COMPLETO';
  showPrices: boolean;
  showStock: boolean;
  logo: string | null;
  businessName: string;
  eslogan: string | null;
}

const DEFAULT: BrandingContextValue = {
  business: null,
  isLoading: false,
  primaryColor: '#0d9488',
  secondaryColor: '#0f766e',
  accentColor: '#f59e0b',
  font: 'Inter',
  theme: 'CLARO',
  radius: 'MEDIO',
  showPrices: true,
  showStock: true,
  logo: null,
  businessName: 'Mocoa Market',
  eslogan: null,
};

const BrandingContext = createContext<BrandingContextValue>(DEFAULT);

function isValidHex(c: string | null | undefined): c is string {
  return !!c && /^#([0-9a-fA-F]{3}){1,2}$/.test(c);
}

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const isSuperAdmin = useAuthStore((s) => s.user?.rol === 'SUPER_ADMIN');
  const shouldApplyBusinessTheme = !pathname?.startsWith('/admin');

  const enabled = !!token && !isSuperAdmin;

  const { data: business, isLoading } = useQuery({
    queryKey: queryKeys.tenant.profile,
    queryFn: () => getBusinessProfile(token!),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const value = useMemo<BrandingContextValue>(() => {
    if (!business) return { ...DEFAULT, isLoading };
    const bs = business.businessSettings;
    return {
      business,
      isLoading,
      primaryColor: isValidHex(bs?.colorPrimario) ? bs.colorPrimario! : DEFAULT.primaryColor,
      secondaryColor: isValidHex(bs?.colorSecundario) ? bs.colorSecundario! : DEFAULT.secondaryColor,
      accentColor: isValidHex(bs?.colorAcento) ? bs.colorAcento! : DEFAULT.accentColor,
      font: bs?.fuente ?? DEFAULT.font,
      theme: (bs?.modoTema as BrandingContextValue['theme']) ?? DEFAULT.theme,
      radius: (bs?.radioTarjeta as BrandingContextValue['radius']) ?? DEFAULT.radius,
      showPrices: bs?.mostrarPrecios ?? true,
      showStock: bs?.mostrarStock ?? true,
      logo: bs?.logo ?? business.logo ?? null,
      businessName: business.nombre,
      eslogan: bs?.eslogan ?? null,
    };
  }, [business, isLoading]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', value.primaryColor);
    root.style.setProperty('--brand-primary-hsl', hexToHsl(value.primaryColor));
    root.style.setProperty('--brand-secondary', value.secondaryColor);
    root.style.setProperty('--brand-accent', value.accentColor);
    root.style.setProperty('--brand-font', value.font);
    if (!shouldApplyBusinessTheme) return;

    if (value.theme === 'OSCURO') root.classList.add('dark');
    else if (value.theme === 'CLARO') root.classList.remove('dark');
    else {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', dark);
    }
  }, [shouldApplyBusinessTheme, value.primaryColor, value.secondaryColor, value.accentColor, value.font, value.theme]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
