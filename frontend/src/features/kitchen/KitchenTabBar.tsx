import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { Icon, type IconName } from '@/design-system';
import { cn } from '@/lib/cn';

export type KitchenTab = { to: string; label: string; icon: IconName; end?: boolean };

/**
 * The KDS primary nav, in one place so the phone tab bar and the tablet/TV
 * topbar can never drift apart.
 */
export const KITCHEN_TABS: KitchenTab[] = [
  { to: '/kitchen', label: 'Board', icon: 'grid', end: true },
  { to: '/kitchen/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/kitchen/orders', label: 'Orders', icon: 'order' },
  { to: '/kitchen/staff', label: 'Staff', icon: 'users' },
  { to: '/kitchen/tables', label: 'Tables', icon: 'grid' },
  { to: '/kitchen/menu', label: 'Menu', icon: 'utensils' },
  { to: '/kitchen/history', label: 'History', icon: 'clock' },
  { to: '/kitchen/profile', label: 'Profile', icon: 'user' },
];

/**
 * PHONE split. Eight tabs at 375px is ~47px each — under the 44px target only
 * once you subtract padding, and the labels collide (which is exactly how the
 * bar shipped). The four a cook touches constantly stay on the bar; the rest
 * move behind More, which is the overflow this file always said they needed.
 */
export const PRIMARY_TABS: KitchenTab[] = KITCHEN_TABS.filter((t) =>
  ['/kitchen', '/kitchen/orders', '/kitchen/dashboard', '/kitchen/menu'].includes(t.to),
);
export const OVERFLOW_TABS: KitchenTab[] = KITCHEN_TABS.filter((t) => !PRIMARY_TABS.includes(t));

/**
 * KitchenTabBar — the phone bottom navigation.
 *
 * Deliberately PINNED (no hide-on-scroll, unlike the customer PWA): kitchen
 * staff work one-handed with the other hand busy, often scrolling a long queue,
 * and a bar that ducks away is a bar you have to chase. It also respects the
 * home-indicator inset so the last row of tabs stays tappable.
 *
 * Seven tabs is the ceiling here: at 375px that's ~53px each, still clear of the
 * 44px touch-target minimum but with no room left. An eighth belongs behind an
 * overflow rather than squeezed in.
 */
export function KitchenTabBar({ className }: { className?: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const overflowActive = OVERFLOW_TABS.some((t) => pathname.startsWith(t.to));

  return (
    <>
    {moreOpen && (
      <>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-50 bg-overlay/50"
        />
        <div
          className="fixed inset-x-0 z-50 rounded-t-2xl border-t border-border bg-surface p-3 shadow-2xl"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="grid grid-cols-4 gap-2">
            {OVERFLOW_TABS.map((t) => (
              <button
                key={t.to}
                type="button"
                onClick={() => { setMoreOpen(false); navigate(t.to); }}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl p-3 text-[0.6875rem] font-semibold transition-colors',
                  pathname.startsWith(t.to) ? 'bg-primary-soft text-primary' : 'text-foreground-muted hover:bg-muted',
                )}
              >
                <Icon name={t.icon} className="h-5 w-5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </>
    )}
    <nav
      aria-label="Kitchen sections"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex items-stretch border-t border-border bg-surface/95 backdrop-blur',
        className,
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {PRIMARY_TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.625rem] font-semibold transition-colors',
              'min-h-14 outline-none focus-visible:bg-muted',
              isActive ? 'text-primary' : 'text-foreground-subtle hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'grid h-7 w-9 place-items-center rounded-lg transition-colors',
                  isActive && 'bg-primary-soft',
                )}
              >
                <Icon name={t.icon} className="h-[1.125rem] w-[1.125rem]" />
              </span>
              {t.label}
            </>
          )}
        </NavLink>
      ))}

      {/* More — the overflow. Highlighted when one of ITS pages is open, so the
          bar never looks like nothing is selected. */}
      <button
        type="button"
        onClick={() => setMoreOpen((o) => !o)}
        aria-expanded={moreOpen}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.625rem] font-semibold transition-colors',
          'min-h-14 outline-none focus-visible:bg-muted',
          moreOpen || overflowActive ? 'text-primary' : 'text-foreground-subtle hover:text-foreground',
        )}
      >
        <span className={cn('grid h-7 w-9 place-items-center rounded-lg transition-colors', (moreOpen || overflowActive) && 'bg-primary-soft')}>
          <Icon name="more" className="h-[1.125rem] w-[1.125rem]" />
        </span>
        More
      </button>
    </nav>
    </>
  );
}
