import { api } from '@/platform/api';
import { mapCart } from './mappers';
import type { Cart, CartItemSelection, PublicCoupon } from '../types';

/**
 * CART SERVICE — the guest-owned, server-authoritative cart. The frontend sends
 * only SELECTIONS (product + variant + modifiers + qty); the backend Pricing
 * Engine returns every price. We NEVER send or compute prices.
 *
 * Responses pass through `mapCart` (see mappers.ts) so components consume the
 * flat view types, not the backend's wire shape.
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
  async get(): Promise<Cart> {
    return mapCart(await api.get('/cart', { auth: 'guest' }));
  }

  async addItem(selection: CartItemSelection, idempotencyKey = newIdempotencyKey()): Promise<Cart> {
    return mapCart(
      await api.post('/cart/items', selection, {
        headers: { 'Idempotency-Key': idempotencyKey },
        offlineQueueable: true,
        auth: 'guest',
      }),
    );
  }

  async updateItem(itemId: string, patch: Partial<CartItemSelection>, version?: number): Promise<Cart> {
    return mapCart(
      await api.patch(`/cart/items/${itemId}`, { ...patch, version }, { headers: versioned(version), offlineQueueable: true, auth: 'guest' }),
    );
  }

  setQuantity(itemId: string, quantity: number, version?: number) {
    return this.updateItem(itemId, { quantity }, version);
  }

  async removeItem(itemId: string, version?: number): Promise<Cart> {
    return mapCart(await api.delete(`/cart/items/${itemId}`, { headers: versioned(version), offlineQueueable: true, auth: 'guest' }));
  }

  async applyCoupon(code: string, version?: number): Promise<Cart> {
    return mapCart(await api.post('/cart/apply-coupon', { code, version }, { headers: versioned(version), auth: 'guest' }));
  }

  async removeCoupon(version?: number): Promise<Cart> {
    return mapCart(await api.delete('/cart/remove-coupon', { headers: versioned(version), auth: 'guest' }));
  }

  /** Public coupons the customer can browse for this cart's restaurant. */
  availableCoupons(): Promise<PublicCoupon[]> {
    return api.get<PublicCoupon[]>('/cart/coupons', { auth: 'guest' });
  }

  async setNotes(notes: string, version?: number): Promise<Cart> {
    return mapCart(await api.patch('/cart', { notes, version }, { headers: versioned(version), auth: 'guest' }));
  }

  clear() {
    return api.delete<{ abandoned: boolean; id?: string }>('/cart', { auth: 'guest' });
  }

  /** Lock the cart for checkout (freezes pricing). Order module converts it. */
  async lockForCheckout(): Promise<Cart> {
    return mapCart(await api.post('/cart/checkout', {}, { auth: 'guest' }));
  }
}

export const cartService = new CartService();
