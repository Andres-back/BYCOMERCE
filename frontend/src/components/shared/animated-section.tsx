'use client';

import { useRef } from 'react';
import { useGsapStagger, useGsapAnimation } from '@/hooks/use-gsap';
import { cn } from '@/lib/utils';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
  preset?: 'fadeUp' | 'fadeIn' | 'scaleIn' | 'slideLeft' | 'slideRight';
  delay?: number;
  duration?: number;
}

export function AnimatedSection({ children, className, as: Tag = 'div', preset = 'fadeUp', delay = 0, duration = 0.6 }: AnimatedSectionProps) {
  const ref = useGsapAnimation<HTMLDivElement>({ preset, delay, duration });
  return <Tag ref={ref} className={className}>{children}</Tag>;
}

interface AnimatedGridProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}

export function AnimatedGrid({ children, className }: AnimatedGridProps) {
  const count = Array.isArray(children) ? (children as any[]).length : 1;
  const ref = useGsapStagger<HTMLDivElement>(count, { stagger: 0.05 });
  return <div ref={ref} className={className}>{children}</div>;
}

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

export function AnimatedCard({ children, className, index = 0 }: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { useGsapAnimation } = require('@/hooks/use-gsap');
  
  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{ opacity: 0, transform: 'translateY(20px)' }}
      data-animate
    >
      {children}
    </div>
  );
}
