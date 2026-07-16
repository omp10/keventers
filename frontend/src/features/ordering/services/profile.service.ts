import { api } from '@/platform/api';
import type { CustomerProfile } from '../types';

/**
 * PROFILE SERVICE — the customer profile + preferences. Works for both a guest
 * session and a linked account; the backend returns `isGuest`. Order history lives
 * in the Order service; favorites live in the Discovery Platform.
 */
export type NotificationPreferences = {
  order?: boolean;
  payment?: boolean;
  promotions?: boolean;
  channels?: { email?: boolean; sms?: boolean; whatsapp?: boolean; push?: boolean };
};

class ProfileService {
  me() {
    return api.get<CustomerProfile>('/customer/profile');
  }

  update(patch: Partial<CustomerProfile>) {
    return api.patch<CustomerProfile>('/customer/profile', patch);
  }

  notificationPreferences() {
    return api.get<NotificationPreferences>('/notifications/preferences');
  }

  updateNotificationPreferences(patch: NotificationPreferences) {
    return api.patch<NotificationPreferences>('/notifications/preferences', patch);
  }
}

export const profileService = new ProfileService();
