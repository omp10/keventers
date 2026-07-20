import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/platform/auth';

import { Button, EmptyState, ErrorState, OfflineState } from '@/design-system';

/** Full-page wrappers around the F1 state components, for use as route elements. */

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[70vh] place-items-center p-6">{children}</div>;
}

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <PageShell>
      <EmptyState
        illustration="empty"
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={<Button onClick={() => navigate('/')}>Go home</Button>}
      />
    </PageShell>
  );
}

/**
 * 403 — reached by someone SIGNED IN with the wrong role, most often a customer
 * opening /admin or /dashboard. Since login became mandatory that is a common
 * accident, and "Go back" only returns them to the page that just rejected
 * them: a dead end.
 *
 * The real fix is to say WHICH account they are on and let them switch. It
 * cannot redirect to the admin login automatically — those pages bounce an
 * authenticated user back, which loops forever — so signing out first is the
 * honest route, and it is one tap.
 */
export function ForbiddenPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const signedInAs = user?.email || user?.phone || null;

  return (
    <PageShell>
      <ErrorState
        title="Access denied"
        description={
          signedInAs
            ? `This area needs a different account. You are signed in as ${signedInAs}.`
            : "You don't have permission to view this page."
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
            >
              Sign in as someone else
            </Button>
            <Button variant="secondary" onClick={() => navigate('/', { replace: true })}>
              Go home
            </Button>
          </div>
        }
      />
    </PageShell>
  );
}

export function ServerErrorPage({ onRetry }: { onRetry?: () => void }) {
  return (
    <PageShell>
      <ErrorState title="Something went wrong" description="We hit an unexpected error. Please try again in a moment." onRetry={onRetry ?? (() => window.location.reload())} />
    </PageShell>
  );
}

export function OfflinePage({ onRetry }: { onRetry?: () => void }) {
  return (
    <PageShell>
      <OfflineState onRetry={onRetry ?? (() => window.location.reload())} />
    </PageShell>
  );
}
