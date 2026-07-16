import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Icon } from '@/design-system';
import { Logo } from '@/assets';
import { glass } from '@/utils/style';
import { defaultRenderLink, type NavItem, type RenderLink } from './types';

export type CustomerLayoutProps = {
  /** Bottom tab items (mobile-first PWA nav). */
  tabs?: NavItem[];
  header?: ReactNode;
  /** Right-side header slot (cart, profile). */
  headerActions?: ReactNode;
  renderLink?: RenderLink;
  children: ReactNode;
  className?: string;
};

/**
 * CustomerLayout — the mobile-first Customer PWA shell: a frosted top brand bar,
 * a scrollable content area (safe-area aware), and a bottom tab bar. Designed for
 * one-hand phone use with generous touch targets; scales gracefully to tablet.
 */
export function CustomerLayout({ tabs, header, headerActions, renderLink = defaultRenderLink, children, className }: CustomerLayoutProps) {
  return (
    <div className={cn('flex min-h-dvh flex-col bg-background', className)}>
      <header className={cn('sticky top-0 z-[100] flex h-14 items-center justify-between gap-3 px-4', glass())} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {header ?? <Logo size={26} />}
        <div className="flex items-center gap-1.5">{headerActions}</div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-5">{children}</div>
      </main>

      {tabs && tabs.length > 0 && (
        <nav
          className={cn('sticky bottom-0 z-[100] flex items-stretch border-t border-border', glass())}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="Primary"
        >
          {tabs.map((tab) => {
            const content = (
              <span
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[0.6875rem] font-medium transition-colors outline-none',
                  tab.active ? 'text-primary' : 'text-foreground-subtle hover:text-foreground',
                )}
              >
                <span className="relative">
                  {tab.icon && <Icon name={tab.icon} size="md" />}
                  {tab.badge && <span className="absolute -right-2 -top-1.5">{tab.badge}</span>}
                </span>
                {tab.label}
              </span>
            );
            return (
              <div key={tab.key} className="flex flex-1">
                {renderLink(tab, content, 'flex flex-1')}
              </div>
            );
          })}
        </nav>
      )}
    </div>
  );
}
