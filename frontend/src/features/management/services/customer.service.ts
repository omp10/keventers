import { api, type Paginated } from '@/platform/api';
import type { Customer, CustomerDetail, CustomerNote } from '../types';

/**
 * CUSTOMER SERVICE — consumes the backend Customer Platform (profiles, loyalty,
 * rewards, favorites, marketing prefs). Read-mostly; loyalty math is backend-owned.
 */
export type CustomerFilters = { q?: string; tier?: string; marketing?: boolean; hasOrders?: boolean };

class CustomerService {
  list(filters: CustomerFilters, page = 1, limit = 25): Promise<Paginated<Customer>> {
    return api.paginate<Customer>('/restaurant/customers', { query: { ...filters, page, limit } });
  }
  get(id: string) {
    return api.get<CustomerDetail>(`/restaurant/customers/${id}`);
  }
  updateMarketing(id: string, marketing: Customer['marketing']) {
    return api.patch<Customer>(`/restaurant/customers/${id}/marketing`, marketing);
  }
  addNote(id: string, note: string) {
    return api.post<CustomerNote>(`/restaurant/customers/${id}/notes`, { note });
  }
  /** Export URL for the current filter (CSV via backend). */
  exportUrl(filters: CustomerFilters) {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
    return `/restaurant/customers/export?${q.toString()}`;
  }
}

export const customerService = new CustomerService();
