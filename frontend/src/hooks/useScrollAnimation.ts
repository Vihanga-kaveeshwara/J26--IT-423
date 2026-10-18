import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook that adds the 'visible' class to observed elements
 * when they enter the viewport.
 */
export function useScrollAnimation() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observe = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
    }
    observerRef.current.observe(node);
  }, []);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return observe;
}
