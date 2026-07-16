import { useEffect, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';

export type KitchenLayoutProps = {
  header?: ReactNode;
  children: ReactNode;
  /** Force dark mode for glare-free kitchen displays (default true). */
  forceDark?: boolean;
  className?: string;
};

/**
 * KitchenLayout — a full-screen, high-contrast shell for wall-mounted KDS
 * displays. Minimal chrome, large type + touch targets, and a fixed header for
 * station context. Forces dark mode (glare/eye-strain on always-on screens) while
 * restoring the user's preference on unmount.
 */
export function KitchenLayout({ header, children, forceDark = true, className }: KitchenLayoutProps) {
  const { mode, setMode } = useTheme();
  useEffect(() => {
    if (!forceDark) return;
    const prev = mode;
    setMode('dark');
    return () => setMode(prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceDark]);

  return (
    <div className={cn('flex h-dvh flex-col overflow-hidden bg-background text-foreground', className)}>
      {header && (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6 text-lg font-semibold">
          {header}
        </header>
      )}
      <main className="flex-1 overflow-hidden p-4 3xl:p-6">{children}</main>
    </div>
  );
}
