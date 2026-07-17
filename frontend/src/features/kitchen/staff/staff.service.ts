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
   * Add someone. Creates or links their IAM user and binds a membership, so
   * they can sign in to the staff app by phone and be assigned orders.
   */
  invite: (body: { email: string; firstName?: string; role: AssignableRole }) =>
    api.post<StaffMember>(BASE, body),

  /** Remove a membership (revokes access; the user account survives). */
  remove: (membershipId: string) => api.delete<{ id: string }>(`${BASE}/${membershipId}`),
};
