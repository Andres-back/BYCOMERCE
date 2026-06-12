'use client';

import { useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = containerRef.current;
    if (!el) return;

    import('gsap').then((gsapModule) => {
      gsapModule.default.fromTo(
        el,
        { opacity: 0, y: 20, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out', clearProps: 'transform' },
      );
    });
  }, [pathname]);

  return <div ref={containerRef}>{children}</div>;
}
