import { api } from '@/platform/api';
import { tokenStore } from '@/platform/auth';

/**
 * QR SERVICE — turns a scanned or typed QR code into an ORDERING SESSION.
 *
 * It used to POST `/public/qr/resolve`, an endpoint the backend has never had:
 * every manual code entry 404'd, the scanner fell into its generic "invalid QR"
 * state, and the customer was bounced straight back to the QR screen with no
 * way to order. The real endpoint is `/public/qr/scan`, which validates the
 * code AND opens the table session in one call, returning the guest token the
 * rest of the ordering flow needs.
 *
 * Public + guest-friendly (`skipAuth`): scanning happens before any identity
 * exists, and attaching a stale token here is what made a scan fail for someone
 * whose previous session had already expired.
 */
export type QrResolution = {
  valid: boolean;
  branchSlug?: string;
  branchName?: string;
  restaurantName?: string;
  /** Present when the QR is table-bound (carried into the ordering flow). */
  tableCode?: string;
  /** Why an invalid QR failed, for a precise error state. */
  reason?: 'invalid' | 'expired' | 'inactive' | 'not_found';
};

/** The `/public/qr/scan` success payload (see scan.service.js #buildContext). */
type ScanResponse = {
  guestToken?: string;
  context?: {
    restaurant?: { name?: string };
    branch?: { slug?: string | null; name?: string };
    table?: { number?: string; label?: string };
  };
};

const QR_BASE = '/public/qr';

/** Map a backend error onto the scanner's precise failure states. */
function reasonFor(err: unknown): QrResolution['reason'] {
  const code = String((err as { code?: string })?.code ?? '');
  const message = String((err as { message?: string })?.message ?? '').toLowerCase();
  if (code === 'NOT_FOUND' || message.includes('not found')) return 'not_found';
  if (message.includes('expired')) return 'expired';
  if (message.includes('inactive') || message.includes('unavailable') || message.includes('closed')) return 'inactive';
  return 'invalid';
}

class QrService {
  /**
   * Resolve a QR code (raw token or a full scanned value) and OPEN the session.
   * Never throws — the scanner renders a state for every outcome.
   */
  async resolveCode(code: string): Promise<QrResolution> {
    try {
      const res = await api.post<ScanResponse>(`${QR_BASE}/scan`, { code }, { skipAuth: true });
      const branchSlug = res?.context?.branch?.slug ?? undefined;
      // A scan that yields no branch slug cannot route anywhere useful.
      if (!res?.guestToken || !branchSlug) return { valid: false, reason: 'invalid' };

      // The session is live from here on: persist the token BEFORE the caller
      // navigates, or the menu mounts with no session and bounces them back.
      tokenStore.setGuest(res.guestToken);

      return {
        valid: true,
        branchSlug,
        branchName: res.context?.branch?.name,
        restaurantName: res.context?.restaurant?.name,
        tableCode: res.context?.table?.number ?? res.context?.table?.label,
      };
    } catch (err) {
      return { valid: false, reason: reasonFor(err) };
    }
  }
}

export const qrService = new QrService();
