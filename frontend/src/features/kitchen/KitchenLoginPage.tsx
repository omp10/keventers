import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { AuthLayout } from '@/layouts';
import { PhoneOtpForm, useAuth } from '@/platform/auth';
import { kitchenOnboardingService } from './onboarding';

/**
 * KitchenLoginPage — the KDS entry point. Sign-in is PHONE-ONLY: enter a number,
 * enter the code. Where you land next depends on who you are:
 *   · brand-new number  → /kitchen/onboarding (set the kitchen up first)
 *   · returning, set up → the kitchen board
 *   · returning, mid-setup → back into onboarding where they left off
 * The onboarding state is backend-owned; this only routes on it.
 */
export function KitchenLoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const fromState = (location.state as { from?: string } | null)?.from;
  const preferred = redirectParam ?? fromState;
  const nextPath = preferred?.startsWith('/') ? preferred : '/kitchen';

  if (isAuthenticated) return <Navigate to={nextPath} replace />;

  const afterSignIn = async ({ isNewUser }: { isNewUser: boolean }) => {
    if (isNewUser) return navigate('/kitchen/onboarding', { replace: true });
    try {
      const onboarding = await kitchenOnboardingService.getState();
      navigate(onboarding.completed ? nextPath : '/kitchen/onboarding', { replace: true });
    } catch {
      // No kitchen attached to this account yet → set one up.
      navigate('/kitchen/onboarding', { replace: true });
    }
  };

  return (
    <AuthLayout
      title="Kitchen sign in"
      subtitle="Enter your phone number to access the live kitchen board"
      aside={(
        <>
          <h2 className="text-3xl font-bold tracking-tight text-balance">Run the line without losing the pace.</h2>
          <p className="mt-3 text-primary-foreground/80">A dedicated KDS for queue visibility, station balance, and fast service recovery.</p>
        </>
      )}
    >
      <PhoneOtpForm onSignedIn={(r) => void afterSignIn(r)} submitLabel="Send code" />
    </AuthLayout>
  );
}
