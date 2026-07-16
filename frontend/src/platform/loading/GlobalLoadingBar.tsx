import { useEffect, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';

import { cn } from '@/lib/cn';
import { selectIsLoading, useLoadingStore } from './store';

/**
 * GlobalLoadingBar — a slim top progress bar reflecting BOTH the loading manager
 * and in-flight TanStack Query fetches. Mount once in the shell. Purely a UX
 * signal; it owns no data.
 */
export function GlobalLoadingBar({ className }: { className?: string }) {
  const managerLoading = useLoadingStore(selectIsLoading);
  const fetching = useIsFetching();
  const active = managerLoading || fetching > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 400);
    return () => clearTimeout(t);
  }, [active]);

  if (!visible) return null;

  return (
    <div className={cn('pointer-events-none fixed inset-x-0 top-0 z-[1700] h-0.5 overflow-hidden', className)} role="progressbar" aria-hidden={!active}>
      <div className="h-full w-full bg-primary animate-[kv-progress-indeterminate_1.1s_ease-in-out_infinite]" />
    </div>
  );
}
