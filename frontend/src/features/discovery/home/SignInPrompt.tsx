import { useNavigate } from 'react-router-dom';

import { Button, Icon } from '@/design-system';
import { useAuth } from '@/platform/auth';
import { cn } from '@/lib/cn';

/**
 * SignInPrompt — the homepage's invitation to sign in, for anyone who hasn't.
 *
 * A PROMPT, not a gate. Guest ordering is a deliberate feature of this app: a
 * stranger can scan the QR on their table and order without an account, and the
 * login screen offers "Continue as guest" for exactly that reason. Redirecting
 * "/" to /login would slam that door — the person most likely to hit it is
 * someone already sitting in the restaurant with a menu open, and making them
 * sign up before they can eat is how you lose the order.
 *
 * So it sells the reason instead of demanding compliance, and renders nothing at
 * all once you're signed in.
 */
export function SignInPrompt({ className }: { className?: string }) {
  const { status } = useAuth();
  const navigate = useNavigate();

  // 'loading' too: flashing a sign-in pitch at someone who IS signed in, for the
  // one beat before their session resolves, reads as being logged out.
  if (status === 'authenticated' || status === 'loading') return null;

  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:p-6',
        className,
      )}
    >
      <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon name="user" className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-bold leading-tight text-foreground">Sign in for the good stuff</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Earn points on every order, reorder your usual in a tap, and keep your history across visits.
        </p>
      </div>
      <Button
        className="shrink-0"
        onClick={() => navigate('/login', { state: { from: '/' } })}
      >
        Sign in
      </Button>
    </section>
  );
}
