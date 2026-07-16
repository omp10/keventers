import { api } from '@/platform/api';
import type { Cart, CartItemSelection } from '../types';

/**
 * CART SERVICE — the guest-owned, server-authoritative cart. The frontend sends
 * only SELECTIONS (product + variant + modifiers + qty); the backend Pricing
 * Engine returns every price. We NEVER send or compute prices.
 *
 * Enterprise semantics preserved from the backend:
 *  · Idempotency-Key on adds (no double-add on retry)
 *  · If-Match version on mutations (optimistic concurrency → 409)
 *  · mutations are offline-queueable (replayed on reconnect by the Offline Platform)
 */
export function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `idem-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  }
}

const versioned = (version?: number) => (version != null ? { 'If-Match': String(version) } : undefined);

class CartService {
  /** The current cart (creates an empty one server-side if none). */
  get() {
    return api.get<Cart>('/cart');
  }

  addItem(selection: CartItemSelection, idempotencyKey = newIdempotencyKey()) {
    return api.post<Cart>('/cart/items', selection, {
      headers: { 'Idempotency-Key': idempotencyKey },
      offlineQueueable: true,
    });
  }

  updateItem(itemId: string, patch: Partial<CartItemSelection>, version?: number) {
    return api.patch<Cart>(`/cart/items/${itemId}`, { ...patch, version }, { headers: versioned(version), offlineQueueable: true });
  }

  setQuantity(itemId: string, quantity: number, version?: number) {
    return this.updateItem(itemId, { quantity }, version);
  }

  removeItem(itemId: string, version?: number) {
    return api.delete<Cart>(`/cart/items/${itemId}`, { headers: versioned(version), offlineQueueable: true });
  }

  applyCoupon(code: string, version?: number) {
    return api.post<Cart>('/cart/apply-coupon', { code, version }, { headers: versioned(version) });
  }

  removeCoupon(version?: number) {
    return api.delete<Cart>('/cart/remove-coupon', { headers: versioned(version) });
  }

  setNotes(notes: string, version?: number) {
    return api.patch<Cart>('/cart', { notes, version }, { headers: versioned(version) });
  }

  clear() {
    return api.delete<{ abandoned: boolean; id?: string }>('/cart');
  }

  /** Lock the cart for checkout (freezes pricing). Order module converts it. */
  lockForCheckout() {
    return api.post<Cart>('/cart/checkout', {});
  }
}

export const cartService = new CartService();
