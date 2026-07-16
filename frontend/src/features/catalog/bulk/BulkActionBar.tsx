import type { ReactNode } from 'react';

import { Button, type IconName } from '@/design-system';
import { cn } from '@/lib/cn';

export type BulkAction = { key: string; label: string; icon?: IconName; tone?: 'default' | 'danger'; onClick: () => void };

/**
 * BulkActionBar — the reusable floating bar shown when items are selected. Any list
 * (products/categories/variants/modifiers/add-ons) passes its selected count +
 * actions. New bulk actions plug in as array entries — no redesign.
 */
export function BulkActionBar({
  count,
  actions,
  onClear,
  pending,
  extra,
}: {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
  pending?: boolean;
  extra?: ReactNode;
}) {
  if (count <= 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/95 p-2 pl-4 shadow-xl backdrop-blur animate-[kv-pop-in_180ms_ease-out] motion-reduce:animate-none">
        <span className="mr-1 text-sm font-semibold text-foreground">{count} selected</span>
        <button type="button" onClick={onClear} className="text-xs font-medium text-foreground-muted hover:text-foreground">Clear</button>
        <div className="mx-1 h-5 w-px bg-border" aria-hidden />
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {actions.map((a) => (
            <Button
              key={a.key}
              size="sm"
              variant={a.tone === 'danger' ? 'ghost' : 'secondary'}
              leftIcon={a.icon}
              loading={pending}
              onClick={a.onClick}
              className={cn(a.tone === 'danger' && 'text-danger')}
            >
              {a.label}
            </Button>
          ))}
          {extra}
        </div>
      </div>
    </div>
  );
}
