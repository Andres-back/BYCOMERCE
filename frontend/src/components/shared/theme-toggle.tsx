'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || pathname?.startsWith('/admin')) return null;

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="fixed bottom-6 right-6 z-50 flex size-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-gray-200 transition-all hover:scale-110 hover:shadow-xl dark:bg-gray-800 dark:ring-gray-700"
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? <Sun className="size-5 text-amber-400" /> : <Moon className="size-5 text-gray-600" />}
    </button>
  );
}
