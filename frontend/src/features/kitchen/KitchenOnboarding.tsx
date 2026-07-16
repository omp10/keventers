import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Button, Card, Icon, Spinner } from '@/design-system';
import { ApiError } from '@/platform/api';
import { useAuth } from '@/platform/auth';
import { kitchenOnboardingService, type KitchenOnboardingState } from './onboarding';

/**
 * Onboarding has three outcomes, and they are NOT the same thing:
 *   · 'ready'      — setup complete, open the board
 *   · 'incomplete' — a kitchen exists but still needs setup steps
 *   · 'no-kitchen' — this account isn't attached to any restaurant yet
 * A phone-first sign-in lands new numbers here, so 'no-kitchen' is the common
 * case and deserves its own explanation rather than an error.
 */
type Outcome =
  | { kind: 'loading' }
  | { kind: 'ready'; state: KitchenOnboardingState }
  | { kind: 'incomplete'; state: KitchenOnboardingState }
  | { kind: 'no-kitchen' }
  | { kind: 'error'; message: string };

function useKitchenOnboarding(): Outcome {
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    kitchenOnboardingService
      .getState()
      .then((state) => {
        if (!active) return;
        setOutcome(state.completed ? { kind: 'ready', state } : { kind: 'incomplete', state });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        // No tenant/restaurant resolves for this account → they have no kitchen
        // yet, which is a state to explain, not a failure to report.
        const status = reason instanceof ApiError ? reason.kind : null;
        if (status === 'forbidden' || status === 'not_found' || status === 'unauthorized') {
          setOutcome({ kind: 'no-kitchen' });
          return;
        }
        setOutcome({ kind: 'error', message: reason instanceof Error ? reason.message : 'Unknown error' });
      });
    return () => {
      active = false;
    };
  }, []);

  return outcome;
}

/** Gate: only lets a fully set-up kitchen through to the board. */
export function KitchenOnboardingGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const outcome = useKitchenOnboarding();

  if (outcome.kind === 'loading') {
    return <div className="grid min-h-dvh place-items-center bg-background"><Spinner size="lg" /></div>;
  }
  if (outcome.kind === 'ready') return <>{children}</>;

  const from = `${location.pathname}${location.search}${location.hash}`;
  return <Navigate to="/kitchen/onboarding" replace state={{ from }} />;
}

export function KitchenOnboardingPage() {
  const outcome = useKitchenOnboarding();
  const navigate = useNavigate();
  const { logout } = useAuth();

  if (outcome.kind === 'loading') {
    return <div className="grid min-h-dvh place-items-center bg-background"><Spinner size="lg" /></div>;
  }
  if (outcome.kind === 'ready') return <Navigate to="/kitchen" replace />;

  const noKitchen = outcome.kind === 'no-kitchen';

  return (
    <main className="min-h-dvh bg-background px-5 py-12 text-foreground">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Kitchen setup</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
          {noKitchen ? 'Register your restaurant' : 'Finish restaurant onboarding'}
        </h1>
        <p className="mt-3 text-foreground-muted">
          {noKitchen
            ? "This number isn't linked to a restaurant yet. Register one to get started — our team reviews it and unlocks your kitchen board."
            : 'This restaurant is not ready to open the kitchen board yet. Complete the remaining setup, then return here.'}
        </p>

        <Card padding="lg" className="mt-8">
          {noKitchen ? (
            <>
              <h2 className="text-lg font-semibold">What happens next</h2>
              <ol className="mt-4 space-y-3 text-sm text-foreground-muted">
                {[
                  'Send us your restaurant details.',
                  'Our team reviews and approves the application.',
                  'Sign in with this number — your kitchen board opens automatically.',
                ].map((line, i) => (
                  <li key={line} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    {line}
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button leftIcon="mail" onClick={() => navigate('/kitchen/onboarding/register')}>
                  Start registration
                </Button>
                <Button variant="ghost" onClick={() => window.location.reload()}>
                  I've been approved — check again
                </Button>
              </div>
            </>
          ) : outcome.kind === 'error' ? (
            <>
              <h2 className="text-lg font-semibold">We couldn't load your setup</h2>
              <p className="mt-3 text-sm text-danger">{outcome.message}</p>
              <Button className="mt-6" leftIcon="refresh" onClick={() => window.location.reload()}>
                Try again
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Remaining setup</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {outcome.state.pendingSteps.map((step) => (
                  <div key={step} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm capitalize">
                    <Icon name="circle" className="h-3.5 w-3.5 text-foreground-subtle" />
                    {step.replaceAll('_', ' ')}
                  </div>
                ))}
              </div>
              <Button className="mt-6" leftIcon="refresh" onClick={() => window.location.reload()}>
                Check setup again
              </Button>
            </>
          )}
        </Card>

        <Button variant="link" size="sm" className="mt-6" onClick={() => void logout().then(() => navigate('/kitchen/login'))}>
          Sign in with a different number
        </Button>
      </div>
    </main>
  );
}
