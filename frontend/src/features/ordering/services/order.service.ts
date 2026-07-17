import { api, type Paginated } from '@/platform/api';
import { newIdempotencyKey } from './cart.service';
import { mapOrder } from './mappers';
import type { Order } from '../types';

/**
 * ORDER SERVICE — converts the locked cart into an immutable order and reads order
 * state. The frontend never sets prices/status; the backend owns both. Checkout is
 * idempotent (Idempotency-Key + backend's one-order-per-cart guarantee).
 *
 * Responses pass through `mapOrder` (see mappers.ts) so pages consume the flat
 * view types, not the backend's wire shape.
 */
export type CheckoutInput = {
  notes?: string;
  channel?: string;
  acceptedTerms?: boolean;
};

class OrderService {
  async checkout(input: CheckoutInput, idempotencyKey = newIdempotencyKey()): Promise<Order> {
    return mapOrder(await api.post('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey }, auth: 'guest' }));
  }

  async get(orderId: string): Promise<Order> {
    return mapOrder(await api.get(`/orders/${orderId}`, { auth: 'guest' }));
  }

  async list(page = 1, limit = 20): Promise<Paginated<Order>> {
    const raw = await api.paginate<Parameters<typeof mapOrder>[0]>('/orders', { query: { page, limit }, auth: 'guest' });
    return { ...raw, items: raw.items.map(mapOrder) };
  }

  async cancel(orderId: string, reason?: string): Promise<Order> {
    return mapOrder(await api.post(`/orders/${orderId}/cancel`, { reason }, { auth: 'guest' }));
  }
}

export const orderService = new OrderService();
export type { Paginated };
