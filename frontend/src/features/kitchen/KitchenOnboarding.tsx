import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { Button, Card, Spinner } from '@/design-system';
import { kitchenOnboardingService, type KitchenOnboardingState } from './onboarding';

function useKitchenOnboarding() {
  const [state, setState] = useState<KitchenOnboardingState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    kitchenOnboardingService.getState()
      .then((value) => { if (active) setState(value); })
      .catch((reason: unknown) => { if (active) setError((reason as Error).message); });
    return () => { active = false; };
  }, []);

  return { state, error };
}

export function KitchenOnboardingGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { state, error } = useKitchenOnboarding();

  if (error) return <Navigate to="/kitchen/onboarding" replace state={{ error }} />;
  if (!state) return <div className="grid min-h-dvh place-items-center"><Spinner size="lg" /></div>;
  if (!state.completed) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/kitchen/onboarding" replace state={{ from }} />;
  }

  return <>{children}</>;
}

export function KitchenOnboardingPage() {
  const { state, error } = useKitchenOnboarding();

  if (!state && !error) return <div className="grid min-h-dvh place-items-center"><Spinner size="lg" /></div>;
  if (state?.completed) return <Navigate to="/kitchen" replace />;

  const pending = state?.pendingSteps ?? [];
  return (
    <main className="min-h-dvh bg-slate-950 px-5 py-12 text-slate-50">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">Kitchen setup</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Finish restaurant onboarding</h1>
        <p className="mt-3 text-slate-300">This restaurant is not ready to open the kitchen board yet. Complete the remaining setup, then return here.</p>

        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold">Remaining setup</h2>
          {error ? (
            <p className="mt-3 text-sm text-danger">We could not load the onboarding status: {error}</p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {pending.map((step) => (
                <div key={step} className="rounded-lg border border-border px-3 py-2 text-sm capitalize">
                  {step.replaceAll('_', ' ')}
                </div>
              ))}
            </div>
          )}
          <Button className="mt-6" onClick={() => window.location.reload()}>Check setup again</Button>
        </Card>
      </div>
    </main>
  );
}

