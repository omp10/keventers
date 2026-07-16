import { qk, useMutationResource, useQueryResource } from '@/platform/query';
import { profileService, type NotificationPreferences } from '../services';
import type { CustomerProfile } from '../types';

/** The customer profile (guest or linked). */
export function useProfile() {
  const query = useQueryResource<CustomerProfile>(qk('customer', 'profile'), () => profileService.me(), { retry: false });
  const update = useMutationResource<CustomerProfile, Partial<CustomerProfile>>((patch) => profileService.update(patch), {
    invalidate: [qk('customer', 'profile')],
  });
  return {
    profile: query.data,
    isLoading: query.isLoading,
    isGuest: query.data?.isGuest ?? true,
    update: (patch: Partial<CustomerProfile>) => update.mutateAsync(patch),
    updating: update.isPending,
  };
}

/** Notification channel/category preferences. */
export function useNotificationPreferences() {
  const query = useQueryResource<NotificationPreferences>(qk('customer', 'notif-prefs'), () => profileService.notificationPreferences(), { retry: false });
  const update = useMutationResource<NotificationPreferences, NotificationPreferences>(
    (patch) => profileService.updateNotificationPreferences(patch),
    { invalidate: [qk('customer', 'notif-prefs')] },
  );
  return {
    preferences: query.data,
    isLoading: query.isLoading,
    update: (patch: NotificationPreferences) => update.mutateAsync(patch),
    updating: update.isPending,
  };
}
