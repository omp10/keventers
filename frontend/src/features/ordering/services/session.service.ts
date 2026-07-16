import { api } from '@/platform/api';
import { tokenStore } from '@/platform/auth';
import { setActiveBranchSlug } from '@/features/discovery';

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

class SessionService {
  /** Open (or reuse) a guest ordering session for a branch. */
  async open(branchSlug: string, opts: { tableNumber: string }): Promise<OrderingSession> {
    const session = await api.post<OrderingSession>(`${BASE}/open`, { branchSlug, ...opts }, { skipAuth: true });
    tokenStore.setGuest(session.token);
    setActiveBranchSlug(session.branchSlug);
    return session;
  }

  /** Current session for the stored guest token (resume). */
  current() {
    return api.get<OrderingSession>(`${BASE}/current`);
  }

  /** Whether a guest ordering session token is present. */
  has() {
    return Boolean(tokenStore.getGuest());
  }

  /** End the local session (does not delete server data). */
  end() {
    tokenStore.setGuest(null);
    setActiveBranchSlug(null);
  }
}

export const sessionService = new SessionService();
