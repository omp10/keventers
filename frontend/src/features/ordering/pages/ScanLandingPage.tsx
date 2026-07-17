import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon, Spinner } from '@/design-system';
import { sessionService } from '../services';

/**
 * /scan/:code — where a table QR actually points.
 *
 * The backend mints `QR_PUBLIC_BASE_URL/<code>` into every printed code, so this
 * route IS the QR's destination and its path shape can't be changed without
 * invalidating codes already on tables. It opens the guest ordering session and
 * drops the diner straight on the menu — scanning should end in food, not a
 * landing page.
 *
 * `/qr` remains the CAMERA experience for someone scanning from inside the app.
 */
export function ScanLandingPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!code || started.current) return;
    started.current = true;

    (async () => {
      try {
        const result = await sessionService.scan(code);
        const slug = result.context?.branch?.slug;
        if (!slug) {
          setError("This table's restaurant isn't reachable right now.");
          return;
        }
        // replace: the QR URL shouldn't sit in history behind the menu.
        navigate(`/r/${slug}/menu`, { replace: true });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't open this table. The code may have expired or been replaced.",
        );
      }
    })();
  }, [code, navigate]);

  if (error) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-6">
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft">
            <Icon name="warning" className="h-5 w-5 text-danger" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-foreground">Couldn't open this table</h1>
          <p className="mt-2 text-sm text-foreground-muted">{error}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button leftIcon="qr" onClick={() => navigate('/qr', { replace: true })}>
              Scan again
            </Button>
            <Button variant="ghost" onClick={() => navigate('/', { replace: true })}>
              Browse restaurants
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-3 text-foreground-muted">
        <Spinner size="lg" />
        <p className="text-sm">Opening your table…</p>
      </div>
    </main>
  );
}
