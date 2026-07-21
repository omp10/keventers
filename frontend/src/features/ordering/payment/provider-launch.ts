import type { PaymentIntent } from '../types';

/**
 * Provider launch — the ONLY place that hands a backend-created intent to a payment
 * provider. It's provider-agnostic: PhonePe uses a hosted redirect (backend builds
 * the URL); Razorpay uses its widget when present. No amounts, keys, or signatures
 * are constructed here — everything comes from the intent the Payment Engine
 * returned. Verification/capture happen server-side (webhook reconciliation).
 */
export type LaunchHandlers = {
  onSuccess: (providerPayload: Record<string, unknown>) => void;
  onCancel: () => void;
  onError: (message: string) => void;
  /** Provider widget/script isn't available — caller should show a fallback. */
  onUnavailable?: () => void;
};

/**
 * Display-only options merged into the Razorpay checkout: the merchant name and
 * order description shown in the sheet, the customer prefill, a preferred method
 * (UPI vs card), and the brand colour. None of these are security-sensitive —
 * key, order_id and amount come from the backend intent and are never set here.
 */
export type LaunchDisplay = {
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  method?: 'upi' | 'card' | 'netbanking' | 'wallet';
  themeColor?: string;
};

type RazorpayCtor = new (options: Record<string, unknown>) => { open: () => void };

const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** Load Razorpay's checkout script once, on demand. Resolves to the constructor
 * (or null if it can't load — offline, blocked, CSP). Idempotent. */
function loadRazorpay(): Promise<RazorpayCtor | null> {
  const existing = (globalThis as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const done = () => resolve((globalThis as unknown as { Razorpay?: RazorpayCtor }).Razorpay ?? null);
    let el = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SRC}"]`);
    if (el) {
      el.addEventListener('load', done, { once: true });
      el.addEventListener('error', () => resolve(null), { once: true });
      return;
    }
    el = document.createElement('script');
    el.src = RAZORPAY_SRC;
    el.async = true;
    el.addEventListener('load', done, { once: true });
    el.addEventListener('error', () => resolve(null), { once: true });
    document.head.appendChild(el);
  });
}

export async function launchPayment(intent: PaymentIntent, handlers: LaunchHandlers, display: LaunchDisplay = {}): Promise<void> {
  // Hosted redirect (e.g. PhonePe) — the backend supplied the exact URL.
  if (intent.redirectUrl) {
    window.location.assign(intent.redirectUrl);
    return;
  }

  if (intent.provider === 'razorpay') {
    const Razorpay = await loadRazorpay();
    if (!Razorpay) {
      handlers.onUnavailable?.();
      return;
    }
    try {
      const rzp = new Razorpay({
        // key, order_id, amount, currency — from the backend intent.
        ...intent.providerPayload,
        name: display.name ?? 'Keventers',
        description: display.description,
        prefill: display.prefill,
        ...(display.method ? { prefill: { ...display.prefill, method: display.method } } : {}),
        theme: display.themeColor ? { color: display.themeColor } : undefined,
        handler: (response: Record<string, unknown>) => handlers.onSuccess(response),
        modal: { ondismiss: () => handlers.onCancel() },
      });
      rzp.open();
    } catch (e) {
      handlers.onError((e as Error).message);
    }
    return;
  }

  // No launch path (e.g. cash is handled by the caller before reaching here).
  handlers.onUnavailable?.();
}
