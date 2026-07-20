import { api, type Paginated } from '@/platform/api';
import type { OrderAction, OrderChannel, OrderStatus, OrderSummary, PaymentStatus, StaffOrderDetail } from '../types';

/**
 * STAFF ORDER SERVICE — reads/advances orders via the backend Order Engine. The
 * frontend never mutates status directly; it POSTs an action and the backend runs
 * the state machine (atomic transition + events). Prices/totals are read-only.
 */
export type OrderFilters = {
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  channel?: OrderChannel[];
  branchId?: string;
  tableId?: string;
  q?: string;
  /** ISO date-from filter. */
  from?: string;
};

function toParams(f: OrderFilters, page: number, limit: number) {
  return {
    status: f.status?.length ? f.status.join(',') : undefined,
    paymentStatus: f.paymentStatus?.length ? f.paymentStatus.join(',') : undefined,
    channel: f.channel?.length ? f.channel.join(',') : undefined,
    branchId: f.branchId,
    tableId: f.tableId,
    q: f.q || undefined,
    from: f.from,
    page,
    limit,
  };
}

class StaffOrderService {
  list(filters: OrderFilters, page = 1, limit = 30): Promise<Paginated<OrderSummary>> {
    return api.paginate<OrderSummary>('/restaurant/orders', { query: toParams(filters, page, limit) });
  }

  get(orderId: string) {
    return api.get<StaffOrderDetail>(`/restaurant/orders/${orderId}`);
  }

  /**
   * The UI verb and the API verb are NOT the same word for one action: the
   * button says "Start preparing" and the action is `start`, but the endpoint is
   * POST /:id/prepare. Sending the UI verb straight through produced
   * "Route not found: POST /api/v1/restaurant/orders/<id>/start" — Start simply
   * did nothing. Every other verb matches, so this maps only the odd one out.
   */
  transition(orderId: string, action: OrderAction, payload?: Record<string, unknown>) {
    const endpoint = action === 'start' ? 'prepare' : action;
    return api.post<StaffOrderDetail>(`/restaurant/orders/${orderId}/${endpoint}`, payload);
  }
}

export const staffOrderService = new StaffOrderService();
