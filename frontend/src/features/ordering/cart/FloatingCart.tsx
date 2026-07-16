import { Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import { useOnlineStatus } from '@/platform/offline';
import { formatMoney } from '../format';
import type { Money } from '../types';

/**
 * FloatingCart — the persistent bottom bar shown whenever the cart has items. It's
 * a reusable summary + CTA; the page decides where "View cart" goes. Surfaces
 * offline state (the cart still works — mutations queue via the Offline Platform).
 */
export function FloatingCart({
  itemCount,
  total,
  onClick,
  className,
}: {
  itemCount: number;
  total?: Money;
  onClick: () => void;
  className?: string;
}) {
  const online = useOnlineStatus();
  if (itemCount <= 0) return null;

  return (
    <div className={cn('fixed inset-x-0 bottom-0 z-40 p-3', className)} style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <button
        type="button"
        onClick={onClick}
        className="mx-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-lg transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
          <Icon name="cart" className="h-5 w-5" />
        </span>
        <span className="flex-1 text-left">
          <span className="block text-sm font-semibold">
            {itemCount} item{itemCount === 1 ? '' : 's'}
            {!online && <span className="ml-2 text-xs font-normal text-primary-foreground/80">· offline</span>}
          </span>
          {total && <span className="block text-xs text-primary-foreground/80">{formatMoney(total)}</span>}
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold">
          View cart <Icon name="chevronRight" className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}
