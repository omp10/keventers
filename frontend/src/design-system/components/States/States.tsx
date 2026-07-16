import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Illustration, type IllustrationName } from '@/assets';
import { Button } from '@/design-system/components/Button';

/**
 * State components — the standardized Empty / Error / Offline screens so every
 * feature renders these boundary states identically. Built on one <StateShell>
 * with a theme-aware illustration, so they rebrand automatically.
 */
export type StateShellProps = {
  illustration?: IllustrationName;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function StateShell({ illustration, icon, title, description, action, className, size = 'md' }: StateShellProps) {
  const art = size === 'sm' ? 88 : size === 'lg' ? 160 : 120;
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)} role="status">
      {icon ?? (illustration && <Illustration name={illustration} size={art} className="mb-5" />)}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-foreground-muted leading-relaxed">{description}</p>}
      {action && <div className="mt-6 flex items-center gap-3">{action}</div>}
    </div>
  );
}

export type EmptyStateProps = Omit<StateShellProps, 'illustration'> & { illustration?: IllustrationName };
export function EmptyState({ illustration = 'empty', ...props }: EmptyStateProps) {
  return <StateShell illustration={illustration} {...props} />;
}

export type ErrorStateProps = Omit<StateShellProps, 'illustration'> & { onRetry?: () => void };
export function ErrorState({ title = 'Something went wrong', description = 'An unexpected error occurred. Please try again.', onRetry, action, ...props }: ErrorStateProps) {
  return (
    <StateShell
      illustration="error"
      title={title}
      description={description}
      action={action ?? (onRetry && <Button variant="secondary" leftIcon="refresh" onClick={onRetry}>Try again</Button>)}
      {...props}
    />
  );
}

export function OfflineState({ title = "You're offline", description = 'Check your connection — we’ll reconnect automatically.', onRetry }: { title?: ReactNode; description?: ReactNode; onRetry?: () => void }) {
  return (
    <StateShell
      illustration="offline"
      title={title}
      description={description}
      action={onRetry && <Button variant="secondary" leftIcon="refresh" onClick={onRetry}>Retry</Button>}
    />
  );
}
