'use client';

import { useRef, useEffect } from 'react';
import type gsapType from 'gsap';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'main';
  delay?: number;
  y?: number;
}

export function FadeIn({ children, className, as: Tag = 'div', delay = 0, y = 20 }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const init = async () => {
      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      
      const el = ref.current;
      if (!el) return;

      gsap.fromTo(
        el,
        { y, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          delay,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom-=50',
            toggleActions: 'play none none none',
          },
        },
      );

      return () => { ScrollTrigger.getAll().forEach((st: ScrollTriggerType) => st.kill()); };
    };
    
    const cleanup = init();
    return () => { cleanup.then(fn => fn?.()); };
  }, [delay, y]);

  return <Tag ref={ref} className={className}>{children}</Tag>;
}

interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}

export function StaggerList({ children, className, stagger = 0.05 }: StaggerListProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const init = async () => {
      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const el = ref.current;
      if (!el) return;
      const items = el.children;
      if (!items.length) return;

      gsap.fromTo(
        items,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom-=80',
            toggleActions: 'play none none none',
          },
        },
      );

      return () => { ScrollTrigger.getAll().forEach((st: ScrollTriggerType) => st.kill()); };
    };
    
    const cleanup = init();
    return () => { cleanup.then(fn => fn?.()); };
  }, [stagger]);

  return <div ref={ref} className={className}>{children}</div>;
}
