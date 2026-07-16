import { Icon } from '@/design-system';
import { cn } from '@/lib/cn';

/**
 * MenuHero — the compact branch header above the menu: cover, name, open state, and
 * a search affordance. Theme-driven; the branch data comes from the Discovery
 * Platform (reused), not refetched here.
 */
export function MenuHero({
  branchName,
  restaurantName,
  coverImageUrl,
  openNow,
  onBack,
  onOpenSearch,
  className,
}: {
  branchName: string;
  restaurantName?: string;
  coverImageUrl?: string;
  openNow?: boolean;
  onBack?: () => void;
  onOpenSearch?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('relative -mx-4 -mt-5 mb-2 h-36 overflow-hidden bg-muted', className)}>
      {coverImageUrl ? (
        <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-primary-soft to-muted" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
        {onBack && (
          <button type="button" aria-label="Back" onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full bg-surface/85 text-foreground shadow backdrop-blur">
            <Icon name="arrowLeft" className="h-5 w-5" />
          </button>
        )}
        {onOpenSearch && (
          <button type="button" aria-label="Search menu" onClick={onOpenSearch} className="grid h-9 w-9 place-items-center rounded-full bg-surface/85 text-foreground shadow backdrop-blur">
            <Icon name="search" className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <h1 className="text-xl font-bold">{branchName}</h1>
        <p className="text-sm text-white/85">
          {restaurantName}
          {openNow != null && <span className={cn('ml-2', openNow ? 'text-success' : 'text-white/70')}>· {openNow ? 'Open now' : 'Closed'}</span>}
        </p>
      </div>
    </div>
  );
}
