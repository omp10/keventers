import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { AuthLayout } from '@/layouts';
import { Button, Input, toast } from '@/design-system';
import { useAuth } from '@/platform/auth';
import { kitchenOnboardingService } from './onboarding';

/**
 * KitchenLoginPage — dedicated sign-in entry for the KDS surface. Keeps the same
 * auth mechanics as staff login, but returns to /kitchen by default and uses
 * kitchen-specific copy so the flow feels like its own app.
 */
export function KitchenLoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const fromState = (location.state as { from?: string } | null)?.from;
  const preferred = redirectParam ?? fromState;
  const nextPath = preferred?.startsWith('/') ? preferred : '/kitchen';

  if (isAuthenticated) return <Navigate to={nextPath} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login({ email, password });
      const onboarding = await kitchenOnboardingService.getState();
      navigate(onboarding.completed ? nextPath : '/kitchen/onboarding', { replace: true });
    } catch (err) {
      toast.error('Sign in failed', { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Kitchen sign in"
      subtitle="Access the live kitchen board, station controls, and service alerts"
      aside={(
        <>
          <h2 className="text-3xl font-bold tracking-tight text-balance">Run the line without losing the pace.</h2>
          <p className="mt-3 text-primary-foreground/80">A dedicated KDS for queue visibility, station balance, and fast service recovery.</p>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-3">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Kitchen work email" autoComplete="username" required autoFocus />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required />
        <Button type="submit" fullWidth size="lg" loading={busy}>Enter kitchen</Button>
      </form>
    </AuthLayout>
  );
}
