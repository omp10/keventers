import { NavLink } from 'react-router-dom';

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
  { to: '/kitchen/stations', label: 'Stations', icon: 'flame' },
  { to: '/kitchen/menu', label: 'Menu', icon: 'utensils' },
  { to: '/kitchen/history', label: 'History', icon: 'clock' },
  { to: '/kitchen/profile', label: 'Profile', icon: 'user' },
];

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
  return (
    <nav
      aria-label="Kitchen sections"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex items-stretch border-t border-border bg-surface/95 backdrop-blur',
        className,
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {KITCHEN_TABS.map((t) => (
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
    </nav>
  );
}
