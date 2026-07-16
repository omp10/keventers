import { api } from '@/platform/api';
import type { Branch, DeliveryZone, NotificationPreferences, RestaurantProfile, Subscription } from '../types';

/**
 * SETTINGS / ORGANIZATION SERVICES — consume the backend Organization module
 * (restaurant profile, branches), Delivery Zone (GeoJSON), Subscription, and
 * Notification preference APIs. The frontend edits + previews only; serviceability,
 * billing, and availability are backend-owned.
 */
class RestaurantSettingsService {
  profile() {
    return api.get<RestaurantProfile>('/restaurant/settings/profile');
  }
  updateProfile(patch: Partial<RestaurantProfile>) {
    return api.patch<RestaurantProfile>('/restaurant/settings/profile', patch);
  }
}

class BranchService {
  list() {
    return api.get<Branch[]>('/restaurant/branches');
  }
  get(id: string) {
    return api.get<Branch>(`/restaurant/branches/${id}`);
  }
  create(body: Partial<Branch>) {
    return api.post<Branch>('/restaurant/branches', body);
  }
  update(id: string, patch: Partial<Branch>) {
    return api.patch<Branch>(`/restaurant/branches/${id}`, patch);
  }
  setOrderingStatus(id: string, orderingStatus: string) {
    return api.patch<Branch>(`/restaurant/branches/${id}`, { orderingStatus });
  }
}

class DeliveryZoneService {
  list(branchId: string) {
    return api.get<DeliveryZone[]>(`/restaurant/branches/${branchId}/zones`);
  }
  create(branchId: string, body: Partial<DeliveryZone>) {
    return api.post<DeliveryZone>(`/restaurant/branches/${branchId}/zones`, body);
  }
  update(branchId: string, zoneId: string, patch: Partial<DeliveryZone>) {
    return api.patch<DeliveryZone>(`/restaurant/branches/${branchId}/zones/${zoneId}`, patch);
  }
  remove(branchId: string, zoneId: string) {
    return api.delete<{ ok: true }>(`/restaurant/branches/${branchId}/zones/${zoneId}`);
  }
  /** Backend serviceability preview for a point — the frontend NEVER computes this. */
  preview(branchId: string, point: { lat: number; lng: number }) {
    return api.get<{ serviceable: boolean; zoneId?: string; zoneName?: string }>(`/restaurant/branches/${branchId}/zones/preview`, { query: point });
  }
}

class SubscriptionService {
  current() {
    return api.get<Subscription>('/restaurant/subscription');
  }
  changePlan(plan: string) {
    return api.post<Subscription>('/restaurant/subscription/change', { plan });
  }
}

class NotificationPrefService {
  get() {
    return api.get<NotificationPreferences>('/notifications/preferences');
  }
  update(patch: NotificationPreferences) {
    return api.patch<NotificationPreferences>('/notifications/preferences', patch);
  }
}

export const restaurantSettingsService = new RestaurantSettingsService();
export const branchService = new BranchService();
export const deliveryZoneService = new DeliveryZoneService();
export const subscriptionService = new SubscriptionService();
export const notificationPrefService = new NotificationPrefService();
