import { api } from '@/platform/api';
import type { CustomerAddress, CustomerPreferences, CustomerProfile } from '../types';

/**
 * PROFILE SERVICE — the customer's own record: profile, preferences, addresses.
 *
 * `/customer/*` identifies the caller from EITHER a linked table session or a
 * signed-in account, so these work whether or not the customer is at a table.
 * An account that has never ordered has no customer record yet and gets a 403 —
 * a "nothing here yet" state, not a failure; hooks surface it as empty.
 *
 * This is the ONE place the wire shape is translated. Identity (name/phone) is
 * NOT sourced here — it belongs to the account and comes from the Auth Platform,
 * which needs no restaurant context.
 */

type ProfileWire = {
  id: string;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  accountStatus?: string;
  origin?: string;
  marketing?: { optedIn?: boolean };
  preferences?: PreferencesWire;
  stats?: {
    totalOrders?: number;
    completedOrders?: number;
    cancelledOrders?: number;
    lifetimeSpend?: number;
    avgOrderValue?: number;
    visitCount?: number;
    lastVisitAt?: string | null;
  };
  createdAt?: string;
};

type PreferencesWire = {
  dietary?: string[];
  allergies?: string[];
  language?: string;
  notifications?: { orderUpdates?: boolean; promotions?: boolean; loyalty?: boolean };
};

/**
 * Phone-first signups get a synthesized `<digits>@phone.keventers.local` address
 * to satisfy the account schema. It is not an email the customer has ever seen,
 * so showing it would be a lie — treat it as absent.
 */
const SYNTHETIC_EMAIL = /@phone\.[^@]+$/i;
const realEmail = (email?: string | null) => (email && !SYNTHETIC_EMAIL.test(email) ? email : undefined);

function toPreferences(w: PreferencesWire = {}): CustomerPreferences {
  return {
    dietary: w.dietary ?? [],
    allergies: w.allergies ?? [],
    language: w.language ?? 'en',
    notifications: {
      orderUpdates: w.notifications?.orderUpdates ?? true,
      promotions: w.notifications?.promotions ?? false,
      loyalty: w.notifications?.loyalty ?? true,
    },
  };
}

function toProfile(w: ProfileWire): CustomerProfile {
  return {
    id: w.id,
    name: w.displayName || undefined,
    email: realEmail(w.email),
    phone: w.phone ?? undefined,
    marketingOptIn: w.marketing?.optedIn ?? false,
    preferences: toPreferences(w.preferences),
    stats: {
      totalOrders: w.stats?.totalOrders ?? 0,
      completedOrders: w.stats?.completedOrders ?? 0,
      // Money from the backend is MINOR units (paise) — the view formats it.
      lifetimeSpend: w.stats?.lifetimeSpend ?? 0,
      avgOrderValue: w.stats?.avgOrderValue ?? 0,
      visitCount: w.stats?.visitCount ?? 0,
      lastVisitAt: w.stats?.lastVisitAt ?? undefined,
    },
    memberSince: w.createdAt,
  };
}

class ProfileService {
  async me(): Promise<CustomerProfile> {
    return toProfile(await api.get<ProfileWire>('/customer/profile'));
  }

  /** Only `displayName` and `marketingOptIn` are editable here (the API is strict). */
  async update(patch: { name?: string; marketingOptIn?: boolean }): Promise<CustomerProfile> {
    const body: Record<string, unknown> = {};
    if (patch.name !== undefined) body.displayName = patch.name;
    if (patch.marketingOptIn !== undefined) body.marketingOptIn = patch.marketingOptIn;
    return toProfile(await api.patch<ProfileWire>('/customer/profile', body));
  }

  async preferences(): Promise<CustomerPreferences> {
    return toPreferences(await api.get<PreferencesWire>('/customer/preferences'));
  }

  async updatePreferences(patch: Partial<CustomerPreferences>): Promise<CustomerPreferences> {
    return toPreferences(await api.patch<PreferencesWire>('/customer/preferences', patch));
  }

  addresses() {
    return api.get<CustomerAddress[]>('/customer/addresses');
  }

  addAddress(address: Omit<CustomerAddress, 'id'>) {
    return api.post<CustomerAddress>('/customer/addresses', address);
  }

  updateAddress(id: string, patch: Partial<CustomerAddress>) {
    return api.patch<CustomerAddress>(`/customer/addresses/${id}`, patch);
  }

  removeAddress(id: string) {
    return api.delete<{ ok: true }>(`/customer/addresses/${id}`);
  }
}

export const profileService = new ProfileService();
