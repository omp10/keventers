import { api, type Paginated } from '@/platform/api';

/** A kitchen queue entry as the STAFF app sees it (mirrors toKitchenEntryDTO). */
export type StaffOrder = {
  id: string;
  orderId: string;
  orderNumber: string;
  branchId: string;
  tableLabel: string;
  orderType: string;
  status: 'pending' | 'assigned' | 'preparing' | 'ready' | 'served' | 'recalled' | 'refired' | 'cancelled';
  priority: string;
  items: { id: string; name: string; quantity: number; variantName?: string }[];
  slaState?: 'on_time' | 'approaching' | 'breached';
  timers?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

/** The action a staff member takes to move an order forward, by current status. */
export const NEXT_ACTION: Partial<Record<StaffOrder['status'], { action: 'preparing' | 'ready' | 'served'; label: string }>> = {
  assigned: { action: 'preparing', label: 'Start preparing' },
  recalled: { action: 'preparing', label: 'Start again' },
  refired: { action: 'preparing', label: 'Start again' },
  preparing: { action: 'ready', label: 'Mark ready' },
  ready: { action: 'served', label: 'Mark served' },
};

/**
 * STAFF SERVICE — the /staff phone app's whole backend surface. Every call is
 * scoped to the AUTHENTICATED user server-side (`/kitchen/my/*`): there is no
 * way to read or advance a colleague's orders from this app.
 */
class StaffService {
  myQueue(query: { search?: string; page?: number; limit?: number } = {}): Promise<Paginated<StaffOrder>> {
    return api.paginate<StaffOrder>('/restaurant/kitchen/my/queue', { query: { limit: 50, ...query } });
  }

  myHistory(query: { search?: string; page?: number; limit?: number } = {}): Promise<Paginated<StaffOrder>> {
    return api.paginate<StaffOrder>('/restaurant/kitchen/my/history', { query: { limit: 50, ...query } });
  }

  transition(orderId: string, action: 'preparing' | 'ready' | 'served'): Promise<StaffOrder> {
    return api.patch<StaffOrder>(`/restaurant/kitchen/my/orders/${orderId}/${action}`);
  }
}

export const staffService = new StaffService();
