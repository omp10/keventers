import { describe, expect, it } from 'vitest';

import { swipeStep } from './PromoCarousel';

/** A typical phone banner width. */
const W = 343;

describe('swipeStep — which slide a released swipe lands on', () => {
  it('ignores a tap (no movement, no speed)', () => {
    expect(swipeStep(0, 0, W)).toBe(0);
  });

  it('ignores a small wobble — a tap is never a swipe', () => {
    expect(swipeStep(-12, 30, W)).toBe(0);
  });

  it('advances on a deliberate drag past a third of the width', () => {
    expect(swipeStep(-(W * 0.4), 0, W)).toBe(1);
  });

  it('goes back when dragged the other way', () => {
    expect(swipeStep(W * 0.4, 0, W)).toBe(-1);
  });

  /** The case distance-only logic gets wrong: a flick barely travels. */
  it('advances on a FAST FLICK that barely moved', () => {
    expect(swipeStep(-20, -900, W)).toBe(1);
    expect(swipeStep(20, 900, W)).toBe(-1);
  });

  it('does not advance on a slow short drag', () => {
    expect(swipeStep(-40, 50, W)).toBe(0);
  });

  it('survives a zero width without dividing the world by zero', () => {
    expect(swipeStep(-5, 0, 0)).toBe(0);
    expect(swipeStep(-900, 0, 0)).toBe(1);
  });
});
