import { useCallback, useState } from 'react';

import { sessionService } from '../services';

/**
 * useSession — manages the guest ORDERING session. Ordering (cart/checkout) needs
 * a backend session; this opens one for a branch on demand and tracks readiness.
 * The token itself lives in the Auth Platform token store (the API Platform reads
 * it automatically), so nothing downstream juggles auth.
 */
export function useSession() {
  const [opening, setOpening] = useState(false);
  const [ready, setReady] = useState(sessionService.has());

  const open = useCallback(async (branchSlug: string, opts?: { tableCode?: string; channel?: string }) => {
    if (sessionService.has()) {
      setReady(true);
      return true;
    }
    setOpening(true);
    try {
      await sessionService.open(branchSlug, opts);
      setReady(true);
      return true;
    } finally {
      setOpening(false);
    }
  }, []);

  const ensure = useCallback((branchSlug: string) => (sessionService.has() ? Promise.resolve(true) : open(branchSlug)), [open]);

  const end = useCallback(() => {
    sessionService.end();
    setReady(false);
  }, []);

  return { hasSession: ready, opening, open, ensure, end };
}
