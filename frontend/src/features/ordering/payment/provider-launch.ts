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

type RazorpayCtor = new (options: Record<string, unknown>) => { open: () => void };

export function launchPayment(intent: PaymentIntent, handlers: LaunchHandlers): void {
  // Hosted redirect (e.g. PhonePe) — the backend supplied the exact URL.
  if (intent.redirectUrl) {
    window.location.assign(intent.redirectUrl);
    return;
  }

  if (intent.provider === 'razorpay') {
    const Razorpay = (globalThis as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
    if (!Razorpay) {
      handlers.onUnavailable?.();
      return;
    }
    try {
      const rzp = new Razorpay({
        ...intent.providerPayload,
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
