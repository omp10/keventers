import { api } from '@/platform/api';

/**
 * The kitchen's roster, via the Organization module's staff endpoints.
 *
 * Staff ARE memberships — there is no separate staff record — so this is the
 * same source the board's assign picker reads (`/restaurant/kitchen/chefs`),
 * just unfiltered and with the management actions attached.
 */
const BASE = '/restaurant/staff';

/** Roles a restaurant may hand out (mirrors the backend's `assignableRoles`). */
export const ASSIGNABLE_ROLES = [
  'staff',
  'waiter',
  'cashier',
  'kitchen_manager',
  'branch_manager',
  'restaurant_manager',
] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export type StaffMember = {
  /** Membership id — what you'd remove. */
  id: string;
  /** User id — what an order assignment stores. */
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  scope: 'organization' | 'restaurant' | 'branch';
  isOwner: boolean;
  status: string;
  userStatus: string | null;
};

export const kitchenStaffService = {
  async list(): Promise<StaffMember[]> {
    const page = await api.paginate<StaffMember>(BASE, { query: { limit: 100 } });
    return page.items;
  },

  /**
   * Add someone. Creates or links their IAM user and binds a membership.
   *
   * The PHONE is what makes them usable: the staff app signs in by OTP, so
   * someone invited with only an email ends up with an account that can never
   * open the app to see the orders you assign them.
   */
  invite: (body: { email: string; phone?: string; firstName?: string; role: AssignableRole }) =>
    api.post<StaffMember>(BASE, body),

  /** Remove a membership (revokes access; the user account survives). */
  remove: (membershipId: string) => api.delete<{ id: string }>(`${BASE}/${membershipId}`),
};
