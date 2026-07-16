import { api } from '@/platform/api';

/**
 * QR SERVICE — resolves a scanned/typed QR to a BRANCH, so the app can open that
 * restaurant. Session creation, tables, and the menu belong to Phase F3.2 (QR
 * Ordering); F3.1 only needs "which branch does this code point to, and is it
 * valid". Public + guest-friendly (`skipAuth`).
 */
export type QrResolution = {
  valid: boolean;
  branchSlug?: string;
  branchName?: string;
  restaurantName?: string;
  /** Present when the QR is table-bound (carried into F3.2 ordering). */
  tableCode?: string;
  /** Why an invalid QR failed, for a precise error state. */
  reason?: 'invalid' | 'expired' | 'inactive' | 'not_found';
};

const QR_BASE = '/public/qr';

class QrService {
  /** Resolve a QR code (the token portion, or a full scanned value) to a branch. */
  resolveCode(code: string) {
    return api.post<QrResolution>(`${QR_BASE}/resolve`, { code }, { skipAuth: true });
  }
}

export const qrService = new QrService();
