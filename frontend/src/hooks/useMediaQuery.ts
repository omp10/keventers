import { useEffect, useState } from 'react';

import { breakpoints, type Breakpoint } from '@/theme';

/** Subscribe to a media query. SSR-safe (returns false until mounted). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** True at/above a named breakpoint (mobile-first). */
export function useBreakpoint(bp: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${breakpoints[bp]}px)`);
}

/** Convenience: is the viewport below `md` (i.e. a phone). */
export function useIsMobile(): boolean {
  return !useBreakpoint('md');
}
