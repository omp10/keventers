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

  /** Advance an order through the backend state machine. */
  transition(orderId: string, action: OrderAction, payload?: Record<string, unknown>) {
    return api.post<StaffOrderDetail>(`/restaurant/orders/${orderId}/${action}`, payload);
  }
}

export const staffOrderService = new StaffOrderService();
