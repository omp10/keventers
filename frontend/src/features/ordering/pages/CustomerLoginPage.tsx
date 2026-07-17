import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Button, toast } from '@/design-system';
import { AuthLayout } from '@/layouts';
import { PhoneOtpForm, useAuth } from '@/platform/auth';
import { sessionService } from '../services';

/**
 * CustomerLoginPage (/login) — passwordless sign-in for customers. Signing in is
 * OPTIONAL by design: guests can order end-to-end without an account, so this
 * page always offers "continue as guest". When a guest with a live table
 * session signs in, the session is linked to the account (best-effort) so their
 * order history follows them.
 */
export function CustomerLoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromState = (location.state as { from?: string } | null)?.from;
  const nextPath = fromState?.startsWith('/') ? fromState : '/account';

  if (isAuthenticated) return <Navigate to={nextPath} replace />;

  const afterSignIn = async () => {
    // Guest → account conversion: carry the table session (and its orders) over.
    if (sessionService.has()) {
      const linked = await sessionService.linkToAccount();
      if (linked) toast.success('Welcome!', { description: 'Your current order now lives on your account.' });
    }
    navigate(nextPath, { replace: true });
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Save favorites, track orders and earn rewards — with just your phone number"
      aside={(
        <>
          <h2 className="text-3xl font-bold tracking-tight text-balance">Your cravings, remembered.</h2>
          <p className="mt-3 text-primary-foreground/80">Order history, loyalty points and one-tap reorders across every visit.</p>
        </>
      )}
    >
      <div className="space-y-4">
        <PhoneOtpForm submitLabel="Send code" onSignedIn={() => void afterSignIn()} />
        <div className="relative text-center">
          <span className="relative bg-transparent px-2 text-xs uppercase tracking-wider text-foreground-subtle">or</span>
        </div>
        <Button variant="ghost" fullWidth onClick={() => navigate(fromState ?? '/')}>
          Continue as guest
        </Button>
      </div>
    </AuthLayout>
  );
}
