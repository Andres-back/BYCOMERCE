'use client';

import { useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const container = containerRef.current;
    const overlay = overlayRef.current;
    if (!container) return;

    const tl = gsap.timeline();

    // Overlay flash
    if (overlay) {
      tl.set(overlay, { opacity: 0, pointerEvents: 'none' });
    }

    // Content entrance
    tl.fromTo(
      container,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' },
      0,
    );

    prevPathRef.current = pathname;

    return () => {
      tl.kill();
    };
  }, [pathname]);

  return (
    <div className="relative">
      <div ref={overlayRef} className="fixed inset-0 z-[100] bg-teal-700 pointer-events-none" style={{ opacity: 0 }} />
      <div ref={containerRef} style={{ opacity: 0 }}>
        {children}
      </div>
    </div>
  );
}
