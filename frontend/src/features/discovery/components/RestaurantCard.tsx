import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, Badge, Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import type { Branch } from '../types';
import { FavoriteButton } from './FavoriteButton';
import {
  formatDistance,
  formatPrepTime,
  formatRating,
  ORDERING_STATUS,
  SERVICE_MODE_ICONS,
  SERVICE_MODE_LABELS,
} from './format';

export type RestaurantCardVariant = 'grid' | 'list' | 'carousel' | 'map';

export type RestaurantCardProps = {
  branch: Branch;
  variant?: RestaurantCardVariant;
  /** Highlight (map⇄list sync). */
  active?: boolean;
  /** Prefetch hook — called on hover/focus. */
  onPrefetch?: (slug: string) => void;
  /** Override navigation (defaults to /r/:slug via router Link). */
  onOpen?: (branch: Branch) => void;
  className?: string;
};

const branchHref = (b: Branch) => `/r/${b.slug}`;

/** Cover image with a smooth fade-in once loaded (skeleton tone shows behind). */
function CoverImage({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onLoad={() => setLoaded(true)}
      className={cn(
        'h-full w-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-105',
        'motion-reduce:transition-none motion-reduce:group-hover:scale-100',
        loaded ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
}

/**
 * RestaurantCard — the ONE reusable branch card. The same component renders in
 * grids, lists, carousels, map overlays, and search results with no forking of
 * business logic; only layout changes by `variant`. Fully theme-driven (tokens
 * only) → white-label ready. Distance/rating/ETA/ordering-status are rendered
 * exactly as the backend supplies them.
 */
export function RestaurantCard({ branch, variant = 'grid', active, onPrefetch, onOpen, className }: RestaurantCardProps) {
  const horizontal = variant === 'list' || variant === 'map';
  const distance = formatDistance(branch.distanceMeters);
  const rating = formatRating(branch.rating);
  const prep = formatPrepTime(branch.prepTimeMinutes);
  const status = ORDERING_STATUS[branch.orderingStatus];
  const modes = branch.services.filter((s) => s.available).slice(0, 3);

  const prefetch = () => onPrefetch?.(branch.slug);
  const handleClick = onOpen
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        onOpen(branch);
      }
    : undefined;

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-surface transition-[box-shadow,transform] duration-300 motion-reduce:transition-none',
        active ? 'border-primary ring-2 ring-primary/30 shadow-lg' : 'border-border hover:shadow-lg',
        // Tactile lift on pointer surfaces (vertical variants only; GPU transform).
        !horizontal && 'hover:-translate-y-1 motion-reduce:hover:translate-y-0',
        horizontal ? 'flex' : 'flex flex-col',
        variant === 'carousel' && 'h-full',
        className,
      )}
      onMouseEnter={prefetch}
      onFocus={prefetch}
    >
      {/* Cover / thumbnail */}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-muted',
          horizontal ? (variant === 'map' ? 'w-24' : 'w-28 sm:w-36') : 'aspect-[16/10] w-full',
        )}
      >
        {branch.coverImageUrl ? (
          <>
            <CoverImage src={branch.coverImageUrl} />
            {/* Soft top scrim keeps badges + heart legible on bright covers. */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-overlay/25 to-transparent" />
          </>
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-soft to-muted">
            <Icon name="utensils" className="h-7 w-7 text-primary/50" />
          </div>
        )}

        {/* Badges (top-left) */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {branch.featured && <Badge tone="accent" variant="solid" className="text-[0.625rem]">Featured</Badge>}
          {branch.promoted && <Badge tone="info" variant="solid" className="text-[0.625rem]">Promoted</Badge>}
          {branch.offer && (
            <Badge tone="success" variant="solid" className="text-[0.625rem]">
              {branch.offer.label}
            </Badge>
          )}
        </div>

        {/* Favorite (top-right) — z-10 keeps it above the card-link overlay */}
        <FavoriteButton branch={branch} className="absolute right-2 top-2 z-10" />
      </div>

      {/* Body */}
      <div className={cn('flex min-w-0 flex-1 flex-col gap-1.5', variant === 'map' ? 'p-3' : 'p-4')}>
        <div className="flex items-start gap-2">
          {branch.restaurant.logoUrl && variant !== 'map' && (
            <Avatar src={branch.restaurant.logoUrl} alt={branch.restaurant.name} size="sm" className="mt-0.5 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold leading-tight text-foreground">{branch.name}</h3>
            <p className="truncate text-xs text-foreground-muted">
              {branch.restaurant.name}
              {branch.area ? ` · ${branch.area}` : ''}
            </p>
          </div>
        </div>

        {/* Meta row: rating · distance · prep */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-foreground-muted">
          {rating && (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Icon name="star" className="h-3.5 w-3.5 text-warning" />
              {rating}
              {branch.ratingCount ? <span className="font-normal text-foreground-subtle">({branch.ratingCount})</span> : null}
            </span>
          )}
          {distance && (
            <span className="inline-flex items-center gap-1">
              <Icon name="truck" className="h-3.5 w-3.5" />
              {distance}
            </span>
          )}
          {prep && (
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" className="h-3.5 w-3.5" />
              {prep}
            </span>
          )}
        </div>

        {/* Open state + ordering status */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {branch.hours.openNow ? (
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              Open
              {branch.hours.closesAt ? <span className="font-normal text-foreground-subtle">· closes {branch.hours.closesAt}</span> : null}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-foreground-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-border-strong" aria-hidden />
              Closed
              {branch.hours.opensAt ? <span className="font-normal text-foreground-subtle">· opens {branch.hours.opensAt}</span> : null}
            </span>
          )}
          <Badge tone={status.tone} variant="soft" className="text-[0.625rem]">{status.label}</Badge>
        </div>

        {/* Service modes */}
        {variant !== 'map' && modes.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {modes.map((m) => (
              <span
                key={m.mode}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[0.6875rem] text-foreground-muted"
              >
                <Icon name={SERVICE_MODE_ICONS[m.mode]} className="h-3 w-3" />
                {SERVICE_MODE_LABELS[m.mode]}
                {m.etaMinutes ? ` · ${m.etaMinutes}m` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Whole-card link overlay (keeps FavoriteButton clickable above it) */}
      <Link
        to={branchHref(branch)}
        onClick={handleClick}
        aria-label={`${branch.name}, ${branch.restaurant.name}`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </article>
  );
}
