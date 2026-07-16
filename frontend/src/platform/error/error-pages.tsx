import { useNavigate } from 'react-router-dom';

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

export function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <PageShell>
      <ErrorState
        title="Access denied"
        description="You don't have permission to view this page."
        action={<Button variant="secondary" onClick={() => navigate(-1)}>Go back</Button>}
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
