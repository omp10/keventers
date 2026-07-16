import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/design-system';
import { cn } from '@/lib/cn';

/** A single toggleable filter chip — the reusable atom of the discovery filters. */
export function FilterChip({
  active,
  onClick,
  icon,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground',
      )}
    >
      {icon && <Icon name={icon} className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
