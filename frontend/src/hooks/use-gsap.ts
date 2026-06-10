'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type AnimationPreset = 'fadeUp' | 'fadeIn' | 'staggerCards' | 'scaleIn' | 'slideLeft' | 'slideRight';

interface UseGsapOptions {
  preset?: AnimationPreset;
  delay?: number;
  duration?: number;
  stagger?: number;
  threshold?: number;
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
}

const PRESETS: Record<AnimationPreset, gsap.TweenVars> = {
  fadeUp: { y: 40, opacity: 0 },
  fadeIn: { opacity: 0 },
  staggerCards: { y: 30, opacity: 0 },
  scaleIn: { scale: 0.9, opacity: 0 },
  slideLeft: { x: -40, opacity: 0 },
  slideRight: { x: 40, opacity: 0 },
};

export function useGsapAnimation<T extends HTMLElement>(options: UseGsapOptions = {}) {
  const ref = useRef<T>(null);
  const { preset = 'fadeUp', delay = 0, duration = 0.6, stagger = 0.08, from, to } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const varsFrom = from ?? (preset ? PRESETS[preset] : {});
    const children = el.children;

    if (children.length > 0 && preset === 'staggerCards') {
      gsap.fromTo(
        children,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration,
          stagger,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom-=100',
            toggleActions: 'play none none none',
          },
        },
      );
    } else {
      gsap.fromTo(
        el,
        varsFrom,
        {
          ...to,
          y: 0,
          x: 0,
          opacity: 1,
          scale: 1,
          duration,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom-=80',
            toggleActions: 'play none none none',
          },
        },
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [preset, delay, duration, stagger]);

  return ref;
}

export function useGsapStagger<T extends HTMLElement>(count: number, options: UseGsapOptions = {}) {
  const ref = useRef<T>(null);
  const { delay = 0, duration = 0.5, stagger = 0.06 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const items = el.children;
    if (items.length === 0) return;

    gsap.fromTo(
      items,
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration,
        stagger,
        delay,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom-=80',
          toggleActions: 'play none none none',
        },
      },
    );

    return () => ScrollTrigger.getAll().forEach((st) => st.kill());
  }, [count, delay, duration, stagger]);

  return ref;
}

export function animateElement(el: HTMLElement | null, vars: gsap.TweenVars) {
  if (!el) return;
  gsap.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', ...vars });
}
