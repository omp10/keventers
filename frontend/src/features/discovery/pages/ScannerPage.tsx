import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Spinner } from '@/design-system';
import { ScannerExperience, type ScannerResolution } from '../scanner';
import { qrService } from '../services';
import { parseScannedValue } from '../scanner';
import { setActiveBranchSlug } from '../entry';

/**
 * /qr — the scanner experience. Handles a direct `?code=` (QR URL opened straight
 * into the app) by resolving it immediately, otherwise shows the live scanner.
 * On success it opens the branch; the session + menu are Phase F3.2.
 */
export function ScannerPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const paramCode = params.get('code');
  const [autoResolving, setAutoResolving] = useState(Boolean(paramCode));
  const handled = useRef(false);

  const open = (r: ScannerResolution) => {
    setActiveBranchSlug(r.branchSlug);
    navigate(`/r/${r.branchSlug}`, { replace: true });
  };

  // Resolve a code passed directly in the URL.
  useEffect(() => {
    if (!paramCode || handled.current) return;
    handled.current = true;
    const parsed = parseScannedValue(paramCode);
    (async () => {
      if (parsed.kind === 'slug') return open({ branchSlug: parsed.slug });
      if (parsed.kind === 'code') {
        try {
          const res = await qrService.resolveCode(parsed.code);
          if (res.valid && res.branchSlug) return open({ branchSlug: res.branchSlug });
        } catch {
          /* fall through to manual scanner */
        }
      }
      setAutoResolving(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramCode]);

  if (autoResolving) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-foreground-muted">
          <Spinner />
          <p className="text-sm">Opening restaurant…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <header className="space-y-1 text-center">
        <h1 className="text-xl font-bold text-foreground">Scan to order</h1>
        <p className="text-sm text-foreground-muted">Point your camera at the QR code on your table.</p>
      </header>
      <ScannerExperience onResolved={open} />
    </div>
  );
}
