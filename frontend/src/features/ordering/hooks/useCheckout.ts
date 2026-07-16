import { useMutationResource } from '@/platform/query';
import { cartService, orderService, type CheckoutInput } from '../services';
import { invalidateCart } from './useCart';
import type { Order } from '../types';

/**
 * useCheckout — locks the cart (freezing Pricing-Engine totals) and converts it to
 * an immutable order. Idempotent on the backend (one order per cart). On success
 * the local cart cache is cleared; the page routes to payment.
 */
export function useCheckout() {
  const m = useMutationResource<Order, CheckoutInput>(
    async (input) => {
      await cartService.lockForCheckout().catch(() => {}); // tolerant if already locked
      return orderService.checkout(input);
    },
    { onSuccess: () => invalidateCart() },
  );

  return {
    checkout: (input: CheckoutInput) => m.mutateAsync(input),
    isPending: m.isPending,
    error: m.error,
    order: m.data,
  };
}
