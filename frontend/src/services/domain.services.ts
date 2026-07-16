import { BaseService } from './base.service';
import type { RequestConfig } from '@/platform/api';

/**
 * DOMAIN SERVICES — thin, typed bindings to the backend business modules. They
 * declare the endpoints the platform can call; consuming apps pass their own
 * response generics via the query hooks. Kept generic (no business types) so this
 * INFRASTRUCTURE phase ships no domain models — apps supply them.
 *
 * Every service extends BaseService → routes through the API Platform.
 */

class RestaurantServiceImpl extends BaseService {
  list<T>(q?: RequestConfig['query']) { return this.paginate<T>('/restaurant/restaurants', q); }
  get<T>(id: string) { return this.api.get<T>(`/restaurant/restaurants/${id}`); }
  publicProfile<T>(id: string) { return this.api.get<T>(`/public/restaurants/${id}`, { skipAuth: true }); }
}

class MenuServiceImpl extends BaseService {
  publicMenu<T>(restaurantId: string) { return this.api.get<T>(`/public/restaurants/${restaurantId}/menu`, { skipAuth: true }); }
  categories<T>(q?: RequestConfig['query']) { return this.paginate<T>('/restaurant/menus', q); }
  products<T>(q?: RequestConfig['query']) { return this.paginate<T>('/restaurant/products', q); }
}

class OrderServiceImpl extends BaseService {
  listForStaff<T>(q?: RequestConfig['query']) { return this.paginate<T>('/restaurant/orders', q); }
  listForGuest<T>(q?: RequestConfig['query']) { return this.paginate<T>('/orders', q); }
  get<T>(id: string) { return this.api.get<T>(`/restaurant/orders/${id}`); }
  checkout<T>(body: unknown) { return this.api.post<T>('/orders', body, { offlineQueueable: true }); }
  transition<T>(id: string, action: string) { return this.api.post<T>(`/restaurant/orders/${id}/${action}`); }
}

class PaymentServiceImpl extends BaseService {
  createIntent<T>(body: unknown) { return this.api.post<T>('/payments/create-intent', body); }
  confirm<T>(body: unknown) { return this.api.post<T>('/payments/confirm', body); }
  listForStaff<T>(q?: RequestConfig['query']) { return this.paginate<T>('/restaurant/payments', q); }
}

class CustomerServiceImpl extends BaseService {
  profile<T>() { return this.api.get<T>('/customer/profile'); }
  updateProfile<T>(body: unknown) { return this.api.patch<T>('/customer/profile', body); }
  loyalty<T>() { return this.api.get<T>('/customer/loyalty'); }
  rewards<T>() { return this.api.get<T>('/customer/rewards'); }
  redeem<T>(rewardId: string) { return this.api.post<T>('/customer/redeem', { rewardId }); }
  ordersForStaff<T>(q?: RequestConfig['query']) { return this.paginate<T>('/restaurant/customers', q); }
}

class NotificationServiceImpl extends BaseService {
  inbox<T>(q?: RequestConfig['query']) { return this.paginate<T>('/notifications', q); }
  markRead<T>(id: string) { return this.api.patch<T>(`/notifications/${id}/read`); }
  markAllRead<T>() { return this.api.post<T>('/notifications/read-all'); }
  preferences<T>() { return this.api.get<T>('/notifications/preferences'); }
  updatePreferences<T>(body: unknown) { return this.api.patch<T>('/notifications/preferences', body); }
}

class AnalyticsServiceImpl extends BaseService {
  dashboard<T>(restaurantId?: string) { return this.api.get<T>('/restaurant/analytics/dashboard', { query: { restaurantId } }); }
  sales<T>(q?: RequestConfig['query']) { return this.api.get<T>('/restaurant/analytics/sales', { query: q }); }
  platform<T>(q?: RequestConfig['query']) { return this.api.get<T>('/admin/analytics/platform', { query: q }); }
}

export const restaurantService = new RestaurantServiceImpl();
export const menuService = new MenuServiceImpl();
export const orderService = new OrderServiceImpl();
export const paymentService = new PaymentServiceImpl();
export const customerService = new CustomerServiceImpl();
export const notificationService = new NotificationServiceImpl();
export const analyticsService = new AnalyticsServiceImpl();
