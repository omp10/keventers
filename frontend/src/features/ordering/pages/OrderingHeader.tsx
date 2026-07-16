import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/design-system';

/** Compact sticky header for ordering pages: back + title + optional action. */
export function OrderingHeader({ title, action, onBack }: { title: string; action?: ReactNode; onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-3 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur">
      <button
        type="button"
        aria-label="Back"
        onClick={onBack ?? (() => navigate(-1))}
        className="grid h-9 w-9 place-items-center rounded-full text-foreground-muted hover:bg-muted"
      >
        <Icon name="arrowLeft" className="h-5 w-5" />
      </button>
      <h1 className="flex-1 truncate text-base font-semibold text-foreground">{title}</h1>
      {action}
    </header>
  );
}
