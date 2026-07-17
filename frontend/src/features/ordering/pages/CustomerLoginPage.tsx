import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Button, Input, toast } from '@/design-system';
import { AuthLayout } from '@/layouts';
import { PhoneOtpForm, useAuth } from '@/platform/auth';
import { sessionService } from '../services';

/**
 * The name step — shown ONLY to someone who just created an account.
 *
 * A phone signup knows a number and nothing else, so until this is answered the
 * account genuinely has no name. Asking here, once, is the cheapest moment: they
 * are already engaged, and every later screen ("Hi Aisha", the order the kitchen
 * reads out) depends on it. Returning customers never see this.
 */
function NameStep({ onDone }: { onDone: () => void }) {
  const { updateName } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      // Everything after the first space is the surname; one field is all this
      // moment deserves, and people write their name the way they write it.
      const [firstName, ...rest] = trimmed.split(/\s+/);
      await updateName({ firstName, lastName: rest.join(' ') || undefined });
      onDone();
    } catch (error) {
      toast.error('Could not save your name', { description: (error as Error).message });
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">What should we call you?</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          We'll use this on your orders and receipts.
        </p>
      </div>
      <label className="block text-sm font-medium text-foreground">
        Your name
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Aisha Khan"
          autoComplete="name"
          maxLength={80}
          className="mt-1.5"
        />
      </label>
      <Button type="submit" fullWidth loading={busy} disabled={!name.trim()}>
        Continue
      </Button>
    </form>
  );
}

/**
 * CustomerLoginPage (/login) — passwordless sign-in for customers. Signing in is
 * OPTIONAL by design: guests can order end-to-end without an account, so this
 * page always offers "continue as guest". When a guest with a live table
 * session signs in, the session is linked to the account (best-effort) so their
 * order history follows them. First-time accounts are asked for a name before
 * they land.
 */
export function CustomerLoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [needsName, setNeedsName] = useState(false);

  const fromState = (location.state as { from?: string } | null)?.from;
  const nextPath = fromState?.startsWith('/') ? fromState : '/account';

  // While the name step is up the user IS authenticated, so this redirect has to
  // yield to it — otherwise signing up would bounce past the question.
  if (isAuthenticated && !needsName) return <Navigate to={nextPath} replace />;

  const land = async () => {
    // Guest → account conversion: carry the table session (and its orders) over.
    if (sessionService.has()) {
      const linked = await sessionService.linkToAccount();
      if (linked) toast.success('Welcome!', { description: 'Your current order now lives on your account.' });
    }
    navigate(nextPath, { replace: true });
  };

  const afterSignIn = async ({ isNewUser }: { isNewUser: boolean }) => {
    if (isNewUser) {
      setNeedsName(true);
      return;
    }
    await land();
  };

  return (
    <AuthLayout
      title={needsName ? 'Almost there' : 'Sign in'}
      subtitle={
        needsName
          ? 'One last thing and you’re in'
          : 'Save favorites, track orders and earn rewards — with just your phone number'
      }
      aside={(
        <>
          <h2 className="text-3xl font-bold tracking-tight text-balance">Your cravings, remembered.</h2>
          <p className="mt-3 text-primary-foreground/80">Order history, loyalty points and one-tap reorders across every visit.</p>
        </>
      )}
    >
      {needsName ? (
        <NameStep onDone={() => void land()} />
      ) : (
        <div className="space-y-4">
          <PhoneOtpForm submitLabel="Send code" onSignedIn={(r) => void afterSignIn(r)} />
          <div className="relative text-center">
            <span className="relative bg-transparent px-2 text-xs uppercase tracking-wider text-foreground-subtle">or</span>
          </div>
          <Button variant="ghost" fullWidth onClick={() => navigate(fromState ?? '/')}>
            Continue as guest
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
