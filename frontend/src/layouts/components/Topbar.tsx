import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Button, ThemeToggleButton } from '@/design-system';
import { glass } from '@/utils/style';
import { useUIStore } from '@/store/ui.store';

export type TopbarProps = {
  /** Left slot (breadcrumb / page title). */
  title?: ReactNode;
  /** Right slot (search, notifications, avatar). */
  actions?: ReactNode;
  /** Show the sidebar collapse toggle (desktop) + mobile menu button. */
  showNavToggle?: boolean;
  sticky?: boolean;
  className?: string;
};

/**
 * Topbar — the frosted app header shared by dashboard shells. Provides the
 * sidebar/mobile-nav toggles, a title slot, an actions slot, and a theme toggle.
 * Sticky + glass by default so content scrolls elegantly beneath it.
 */
export function Topbar({ title, actions, showNavToggle = true, sticky = true, className }: TopbarProps) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);

  return (
    <header className={cn('z-[100] flex h-15 items-center gap-3 border-b border-border px-4', sticky && 'sticky top-0', glass(), className)}>
      {showNavToggle && (
        <>
          <Button variant="ghost" size="icon-sm" className="hidden md:inline-flex" aria-label="Toggle sidebar" onClick={toggleSidebar} leftIcon="menu" />
          <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu" onClick={() => setMobileNavOpen(true)} leftIcon="menu" />
        </>
      )}
      <div className="min-w-0 flex-1">{title}</div>
      <div className="flex items-center gap-1.5">
        {actions}
        <ThemeToggleButton />
      </div>
    </header>
  );
}
