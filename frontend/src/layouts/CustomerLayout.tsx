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
 * the page content, and a bottom tab bar (phone) / header pill nav (desktop).
 * Designed for one-hand phone use with generous touch targets.
 *
 * SCROLLING MODEL — the DOCUMENT scrolls; this shell must never become a scroll
 * container. `position: sticky` resolves against the nearest scrolling ancestor,
 * so an `overflow` here (or on <main>) would silently pin the bottom tabs and the
 * menu's category nav to a box that never scrolls — i.e. they'd vanish off the
 * bottom of the page. The window scroll is also what drives the hero parallax
 * (`useScroll`) and the scroll-reveal observers.
 */
export function CustomerLayout({ tabs, header, headerActions, renderLink = defaultRenderLink, children, className }: CustomerLayoutProps) {
  const hasTabs = Boolean(tabs && tabs.length > 0);
  return (
    // The bottom padding reserves room for the FIXED tab bar so the last row of
    // content can scroll clear of it.
    <div className={cn('relative flex min-h-dvh flex-col bg-background', hasTabs && 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0', className)}>
      {/* Ambient desktop backdrop. `overflow-hidden` belongs HERE (clipping the
          blurred blooms so they can't widen the page), not on the shell. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 hidden overflow-hidden lg:block">
        <div className="absolute -right-40 top-24 h-[32rem] w-[32rem] rounded-full bg-primary-soft blur-3xl" />
        <div className="absolute -left-52 top-[38rem] h-[28rem] w-[28rem] rounded-full bg-accent-soft blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklab,var(--kv-color-foreground)_7%,transparent)_1px,transparent_0)] bg-[size:28px_28px] opacity-35" />
      </div>

      <header className={cn('sticky top-0 z-[100] border-b border-border/70', glass())} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
          {header ?? <Logo size={30} className="lg:[&>span:last-child]:text-xl" />}

          {tabs && tabs.length > 0 && (
            <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-surface/70 p-1.5 shadow-sm lg:flex" aria-label="Primary">
              {tabs.map((tab) => {
                const content = (
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                      tab.active
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-foreground-muted hover:bg-muted hover:text-foreground',
                      tab.emphasized && !tab.active && 'bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground',
                    )}
                  >
                    {tab.icon && <Icon name={tab.icon} className="h-4 w-4" />}
                    {tab.label}
                  </span>
                );
                return <div key={tab.key}>{renderLink(tab, content, 'rounded-full')}</div>;
              })}
            </nav>
          )}

          <div className="flex items-center gap-1.5">{headerActions}</div>
        </div>
      </header>

      {/* No `overflow` here — see the scrolling-model note above. */}
      <main className="relative z-10 flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 lg:max-w-7xl lg:px-8 lg:py-8 xl:py-10">{children}</div>
      </main>

      {tabs && tabs.length > 0 && (
        <nav
          // FIXED and permanent. It used to be `sticky bottom-0` with a
          // hide-on-scroll animation: sticky mis-pins against mobile dynamic
          // viewports (the bar rendered partly below the URL bar — "cut off"),
          // and the duck-away animation read as the nav randomly vanishing.
          className={cn('fixed inset-x-0 bottom-0 z-[100] flex items-stretch border-t border-border lg:hidden', glass())}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="Primary"
        >
          {tabs.map((tab) => {
            // Emphasized tab — the shell's raised primary action (e.g. Scan).
            const content = tab.emphasized ? (
              <span className="flex flex-1 flex-col items-center justify-end gap-0.5 pb-2 text-[0.6875rem] font-semibold text-primary outline-none">
                <span
                  className={cn(
                    '-mt-5 grid h-13 w-13 place-items-center rounded-full bg-primary text-primary-foreground shadow-brand ring-4 ring-background transition-transform active:scale-95 motion-reduce:transition-none',
                    tab.active && 'ring-primary/25',
                  )}
                >
                  {tab.icon && <Icon name={tab.icon} size="lg" />}
                </span>
                {tab.label}
              </span>
            ) : (
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
              <div key={tab.key} className={cn('flex flex-1', tab.emphasized && 'overflow-visible')}>
                {renderLink(tab, content, 'flex flex-1')}
              </div>
            );
          })}
        </nav>
      )}
    </div>
  );
}
