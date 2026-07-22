import { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useReducedMotion } from 'framer-motion';

/**
 * The "it went in" moment.
 *
 * Adding to the cart used to be confirmed by a toast that slid in at the top of
 * the screen — a long way from the thumb that just tapped Add, and easy to miss
 * mid-scroll. This plays a short illustrated confirmation in the middle of the
 * screen instead, so the feedback lands where the user is already looking.
 *
 * One-shot by design (loop=false, self-dismissing): a looping confirmation stops
 * reading as "done" and starts reading as "busy". Pointer-events-none throughout
 * so it can never swallow the next tap — people add two things quickly.
 */
export function AddedToCartBurst({ token, label }: { token: number | null; label?: string }) {
  const reduced = Boolean(useReducedMotion());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!token) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), reduced ? 900 : 1500);
    return () => clearTimeout(t);
  }, [token, reduced]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[1150] grid place-items-center" aria-live="polite">
      <div className="flex flex-col items-center gap-1 rounded-3xl bg-surface/95 px-6 py-5 shadow-2xl ring-1 ring-border backdrop-blur">
        <div className="h-24 w-24">
          <DotLottieReact src="/animations/added-to-cart.lottie" loop={false} autoplay={!reduced} className="h-full w-full" />
        </div>
        <p className="text-sm font-bold text-foreground">Added to cart</p>
        {label && <p className="max-w-[12rem] truncate text-xs text-foreground-muted">{label}</p>}
      </div>
    </div>
  );
}

export default AddedToCartBurst;
