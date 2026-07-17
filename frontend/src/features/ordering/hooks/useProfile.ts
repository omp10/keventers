import { qk, useMutationResource, useQueryResource } from '@/platform/query';
import { useAuth } from '@/platform/auth';
import { profileService } from '../services';
import type { CustomerAddress, CustomerPreferences, CustomerProfile } from '../types';

/**
 * The customer's restaurant-side record — loyalty-bearing stats, preferences.
 *
 * Only fetched for a signed-in customer: `/customer/*` needs an identity, and
 * firing it for an anonymous visitor would just log a 401 on every page load.
 * `retry: false` because the meaningful failure here (403 — signed in, never
 * ordered) is a permanent answer, not a blip: retrying it just delays the empty
 * state.
 */
export function useProfile() {
  const { isAuthenticated } = useAuth();
  const query = useQueryResource<CustomerProfile>(qk('customer', 'profile'), () => profileService.me(), {
    retry: false,
    enabled: isAuthenticated,
  });
  const update = useMutationResource<CustomerProfile, { name?: string; marketingOptIn?: boolean }>(
    (patch) => profileService.update(patch),
    { invalidate: [qk('customer', 'profile')] },
  );
  return {
    profile: query.data,
    isLoading: query.isLoading,
    /** Signed in, but no history at any restaurant yet — nothing to show. */
    isEmpty: !query.data && !query.isLoading,
    update: (patch: { name?: string; marketingOptIn?: boolean }) => update.mutateAsync(patch),
    updating: update.isPending,
  };
}

/** Dietary, allergy, language and notification preferences. */
export function useCustomerPreferences() {
  const { isAuthenticated } = useAuth();
  const query = useQueryResource<CustomerPreferences>(qk('customer', 'preferences'), () => profileService.preferences(), {
    retry: false,
    enabled: isAuthenticated,
  });
  const update = useMutationResource<CustomerPreferences, Partial<CustomerPreferences>>(
    (patch) => profileService.updatePreferences(patch),
    { invalidate: [qk('customer', 'preferences')] },
  );
  return {
    preferences: query.data,
    isLoading: query.isLoading,
    update: (patch: Partial<CustomerPreferences>) => update.mutateAsync(patch),
    updating: update.isPending,
  };
}

/** Saved delivery addresses. */
export function useAddresses() {
  const { isAuthenticated } = useAuth();
  const query = useQueryResource<CustomerAddress[]>(qk('customer', 'addresses'), () => profileService.addresses(), {
    retry: false,
    enabled: isAuthenticated,
  });
  const invalidate = { invalidate: [qk('customer', 'addresses')] };
  const add = useMutationResource<CustomerAddress, Omit<CustomerAddress, 'id'>>((a) => profileService.addAddress(a), invalidate);
  const remove = useMutationResource<{ ok: true }, string>((id) => profileService.removeAddress(id), invalidate);
  return {
    addresses: query.data ?? [],
    isLoading: query.isLoading,
    add: (a: Omit<CustomerAddress, 'id'>) => add.mutateAsync(a),
    remove: (id: string) => remove.mutateAsync(id),
    saving: add.isPending || remove.isPending,
  };
}
