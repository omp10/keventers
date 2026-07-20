import { qk, queryClient, useMutationResource, useQueryResource } from '@/platform/query';
import { cartService, sessionService } from '../services';
import type { Cart, CartItemSelection } from '../types';

const cartKey = qk('ordering', 'cart');

/**
 * useCart — the enterprise cart. The SERVER is authoritative: every mutation
 * returns the full cart (items + Pricing-Engine breakdown + new version), which we
 * write straight into the cache. The frontend never computes prices. Adds
 * auto-open a session; mutations carry the version (optimistic concurrency) and are
 * offline-queueable (replayed by the Offline Platform).
 */
export function useCart() {
  const query = useQueryResource<Cart>(cartKey, () => cartService.get(), {
    enabled: sessionService.has(),
    staleTime: 5_000,
  });

  const setCart = (c: Cart) => queryClient.setQueryData(cartKey, c);
  const version = () => queryClient.getQueryData<Cart>(cartKey)?.version;

  const add = useMutationResource<Cart, CartItemSelection>(
    (sel) => cartService.addItem(sel),
    { onSuccess: setCart },
  );
  const update = useMutationResource<Cart, { itemId: string; patch: Partial<CartItemSelection> }>(
    ({ itemId, patch }) => cartService.updateItem(itemId, patch, version()),
    { onSuccess: setCart },
  );
  const remove = useMutationResource<Cart, string>((itemId) => cartService.removeItem(itemId, version()), { onSuccess: setCart });
  const coupon = useMutationResource<Cart, string>((code) => cartService.applyCoupon(code, version()), { onSuccess: setCart });
  const uncoupon = useMutationResource<Cart, void>(() => cartService.removeCoupon(version()), { onSuccess: setCart });
  const notes = useMutationResource<Cart, string>((n) => cartService.setNotes(n, version()), { onSuccess: setCart });
  const clear = useMutationResource<{ abandoned: boolean; id?: string }, void>(() => cartService.clear(), {
    onSuccess: () => queryClient.removeQueries({ queryKey: cartKey }),
  });

  const cart = query.data;

  return {
    cart,
    items: cart?.items ?? [],
    pricing: cart?.pricing,
    itemCount: cart?.itemCount ?? 0,
    coupon: cart?.coupon ?? null,
    estimatedMinutes: cart?.estimatedMinutes,
    isEmpty: !cart || cart.items.length === 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasSession: sessionService.has(),

    add: (selection: CartItemSelection) => add.mutateAsync(selection),
    setQuantity: (itemId: string, quantity: number) => update.mutateAsync({ itemId, patch: { quantity } }),
    updateItem: (itemId: string, patch: Partial<CartItemSelection>) => update.mutateAsync({ itemId, patch }),
    removeItem: (itemId: string) => remove.mutateAsync(itemId),
    applyCoupon: (code: string) => coupon.mutateAsync(code),
    removeCoupon: () => uncoupon.mutateAsync(),
    setNotes: (n: string) => notes.mutateAsync(n),
    clearCart: () => clear.mutateAsync(),

    isAdding: add.isPending,
    isMutating: add.isPending || update.isPending || remove.isPending || coupon.isPending || uncoupon.isPending,
    couponError: coupon.error,
  };
}

/**
 * Drop the cart cache entirely — the checked-out cart is GONE, not stale.
 *
 * `setQueryData(key, undefined)` does not reliably evict an entry, and
 * `invalidateQueries` only refetches a query that is currently ENABLED — and
 * this one is gated on `sessionService.has()`. So after checkout the old
 * ITEMS survived in the cache: the customer ordered, came back to add
 * something else, and found the cart still holding the food they had just been
 * served. Worse, removing one of those items failed silently, because the item
 * ids belonged to a cart that had already been converted into an order.
 *
 * `removeQueries` actually evicts it, so the next read starts from the server's
 * new, empty cart.
 */
export function invalidateCart() {
  queryClient.removeQueries({ queryKey: cartKey });
}
