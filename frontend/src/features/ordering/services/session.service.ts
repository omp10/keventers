import { api } from '@/platform/api';
import { tokenStore } from '@/platform/auth';
import { setActiveBranchSlug } from '@/features/discovery';
import { rememberBranchName } from './mappers';

/**
 * SESSION SERVICE — the guest ORDERING identity. The backend session is the
 * primary ordering identity (cart/order/payment all reference it). Opening a
 * session returns a guest token, which we store in the Auth Platform's token store
 * so the API Platform automatically authenticates subsequent cart/order calls.
 *
 * QR scanning (F3.1) already resolves a branch; here we OPEN/RESUME the ordering
 * session for that branch. Endpoints centralized as a documented contract.
 */
export type OrderingSession = {
  id: string;
  branchSlug: string;
  branchName?: string;
  tableCode?: string;
  channel?: string;
  /** Guest JWT authorizing cart/order operations. */
  token: string;
  currency?: string;
};

const BASE = '/public/session';

/** What `POST /public/qr/scan` returns: the session, its guest JWT, and the
 *  ordering context (branch, table, menu) the app opens on. */
export type ScanResult = {
  session: { sessionId: string; branchId: string; tableId: string; status: string };
  guestToken: string;
  recoveryCode?: string;
  context: {
    restaurant: { id: string; name: string; slug: string };
    branch: { id: string; name: string; slug: string | null };
    table: { id: string; number: string; seatingCapacity?: number };
    currency?: string;
  };
};

class SessionService {
  /**
   * Scan a table QR — the real entry point for ordering.
   *
   * This is NOT the same as discovery's `qrService.resolveCode`, which only
   * VALIDATES a code and tells you the branch. This opens a guest SESSION (the
   * primary ordering identity: cart, orders and payments all reference it) and
   * returns the branch/table/menu context to land on. Anonymous by design —
   * `skipAuth` because a guest scanning a table has no account yet.
   */
  async scan(code: string): Promise<ScanResult> {
    // NOT skipAuth: a signed-in customer's account token rides along ('auto'
    // prefers the access token) so the backend stamps their customerUserId on
    // the session — orders, loyalty and coupon targeting then attribute to the
    // account. A pure guest sends no account token and stays anonymous.
    const result = await api.post<ScanResult>('/public/qr/scan', { code }, { auth: 'auto' });
    tokenStore.setGuest(result.guestToken);
    if (result.context?.branch?.slug) setActiveBranchSlug(result.context.branch.slug);
    rememberBranchName(result.context?.branch?.name);
    return result;
  }

  /** Open (or reuse) a guest ordering session for a branch. */
  async open(branchSlug: string, opts: { tableNumber: string }): Promise<OrderingSession> {
    // 'auto' (not skipAuth): carry the account token when signed in so the
    // session captures customerUserId — see scan() above.
    const session = await api.post<OrderingSession>(`${BASE}/open`, { branchSlug, ...opts }, { auth: 'auto' });
    tokenStore.setGuest(session.token);
    setActiveBranchSlug(session.branchSlug);
    rememberBranchName(session.branchName);
    return session;
  }

  /** Current session for the stored guest token (resume). */
  current() {
    return api.get<OrderingSession>(`${BASE}/current`, { auth: 'guest' });
  }

  /** Whether a guest ordering session token is present. */
  has() {
    return Boolean(tokenStore.getGuest());
  }

  /**
   * Attach the signed-in customer's account to the current guest session
   * (guest → account conversion). Sends the ACCOUNT token in the header and the
   * guest token in the body as proof of session ownership; the backend then
   * backfills past session orders onto the account. Best-effort by design —
   * failing to link must never block a sign-in.
   */
  async linkToAccount(): Promise<boolean> {
    const guestToken = tokenStore.getGuest();
    if (!guestToken) return false;
    try {
      await api.post(`${BASE}/link`, { guestToken });
      return true;
    } catch {
      return false;
    }
  }

  /** End the local session (does not delete server data). */
  end() {
    tokenStore.setGuest(null);
    setActiveBranchSlug(null);
  }
}

export const sessionService = new SessionService();
