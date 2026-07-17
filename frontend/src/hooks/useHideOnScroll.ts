import { useEffect, useRef, useState } from 'react';

export type HideOnScrollOptions = {
  /**
   * Movement (px) required before the direction is believed. Guards against the
   * jitter of a thumb resting on the screen and against iOS rubber-banding, both
   * of which would otherwise flicker the bar.
   */
  threshold?: number;
  /** Always reveal within this distance of the top (the header zone). */
  revealNearTop?: number;
  /** Set false to pin it open (e.g. under reduced motion). */
  enabled?: boolean;
};

export type ScrollSample = {
  /** Current scroll offset. */
  y: number;
  /** Offset at the last decision. */
  lastY: number;
  viewportHeight: number;
  documentHeight: number;
  threshold: number;
  revealNearTop: number;
};

/**
 * The decision, as a pure function — no DOM, no React — so the rule is testable
 * and reviewable on its own. Returns `null` for "not enough movement to judge;
 * keep the current state and keep accumulating".
 */
export function resolveHidden(s: ScrollSample): boolean | null {
  const delta = s.y - s.lastY;
  if (Math.abs(delta) < s.threshold) return null;

  // Near the top the bar belongs on screen (it reads as part of the header
  // zone); at the very bottom a hidden bar could never be recovered, since
  // there's no further down to scroll.
  const atTop = s.y <= s.revealNearTop;
  const atBottom = s.viewportHeight + s.y >= s.documentHeight - 2;
  return delta > 0 && !atTop && !atBottom;
}

/**
 * useHideOnScroll — true when a sticky bar should duck out of view: the reader
 * is scrolling DOWN, i.e. reaching for content, so chrome gets out of the way;
 * scrolling UP means they want navigation, so it comes back.
 *
 * Reads `window.scrollY` (the document is the scroll container — see
 * CustomerLayout's scrolling-model note) and samples inside rAF, so a scroll
 * burst costs one measurement per frame and the `scrollHeight` read (which
 * forces layout) can never run more often than the browser paints.
 */
export function useHideOnScroll({ threshold = 8, revealNearTop = 24, enabled = true }: HideOnScrollOptions = {}): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const frame = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      return;
    }

    lastY.current = window.scrollY;

    const measure = () => {
      frame.current = 0;
      const next = resolveHidden({
        y: window.scrollY,
        lastY: lastY.current,
        viewportHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        threshold,
        revealNearTop,
      });
      // null → movement was below the threshold: leave `lastY` alone so a slow,
      // deliberate scroll still accumulates to a decision.
      if (next === null) return;
      lastY.current = window.scrollY;
      setHidden(next);
    };

    const onScroll = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [threshold, revealNearTop, enabled]);

  return hidden;
}
