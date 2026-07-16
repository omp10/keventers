import { useEffect, type RefObject } from 'react';

/** Fire when a pointer/touch/focus event occurs outside the referenced element. */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
}
