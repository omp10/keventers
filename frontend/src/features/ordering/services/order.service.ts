import { api, type Paginated } from '@/platform/api';
import { newIdempotencyKey } from './cart.service';
import type { Order } from '../types';

/**
 * ORDER SERVICE — converts the locked cart into an immutable order and reads order
 * state. The frontend never sets prices/status; the backend owns both. Checkout is
 * idempotent (Idempotency-Key + backend's one-order-per-cart guarantee).
 */
export type CheckoutInput = {
  notes?: string;
  channel?: string;
  acceptedTerms?: boolean;
};

class OrderService {
  checkout(input: CheckoutInput, idempotencyKey = newIdempotencyKey()) {
    return api.post<Order>('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } });
  }

  get(orderId: string) {
    return api.get<Order>(`/orders/${orderId}`);
  }

  list(page = 1, limit = 20) {
    return api.paginate<Order>('/orders', { query: { page, limit } });
  }

  cancel(orderId: string, reason?: string) {
    return api.post<Order>(`/orders/${orderId}/cancel`, { reason });
  }
}

export const orderService = new OrderService();
export type { Paginated };
