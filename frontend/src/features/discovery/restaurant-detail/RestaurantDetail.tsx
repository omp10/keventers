import { Avatar, Badge, Button, Icon, Separator, Skeleton } from '@/design-system';
import { MapView } from '@/platform/maps';
import { cn } from '@/lib/cn';
import { FavoriteButton } from '../components/FavoriteButton';
import {
  formatDistance,
  formatPrepTime,
  formatRating,
  ORDERING_STATUS,
  SERVICE_MODE_ICONS,
  SERVICE_MODE_LABELS,
} from '../components/format';
import type { BranchDetail } from '../types';

function Section({ title, icon, children, className }: { title: string; icon: Parameters<typeof Icon>[0]['name']; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-3', className)}>
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">
        <Icon name={icon} className="h-4 w-4" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * RestaurantDetail — the branch detail experience: hero, gallery, hours, contact,
 * amenities, services, map + directions, reviews placeholder, and the Order Now CTA
 * (which enters Phase F3.2 — no menu here). Fully theme-driven / white-label. Works
 * with BRANCH data, matching the backend architecture.
 */
export function RestaurantDetail({ branch, onOrderNow }: { branch: BranchDetail; onOrderNow?: (branch: BranchDetail) => void }) {
  const status = ORDERING_STATUS[branch.orderingStatus];
  const rating = formatRating(branch.rating);
  const distance = formatDistance(branch.distanceMeters);
  const prep = formatPrepTime(branch.prepTimeMinutes);
  const canOrder = branch.orderingStatus === 'available' || branch.orderingStatus === 'busy';
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${branch.location.lat},${branch.location.lng}`;

  return (
    <div className="pb-24">
      {/* Hero */}
      <div className="relative h-56 w-full overflow-hidden rounded-b-3xl bg-muted sm:h-72">
        {branch.coverImageUrl ? (
          <img src={branch.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-soft to-muted">
            <Icon name="utensils" className="h-10 w-10 text-primary/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <FavoriteButton branch={branch} className="absolute right-4 top-4" />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
          {branch.restaurant.logoUrl && <Avatar src={branch.restaurant.logoUrl} alt={branch.restaurant.name} size="lg" className="ring-2 ring-white/80" />}
          <div className="min-w-0 flex-1 text-white">
            <h1 className="truncate text-xl font-bold sm:text-2xl">{branch.name}</h1>
            <p className="truncate text-sm text-white/85">
              {branch.restaurant.name}
              {branch.area ? ` · ${branch.area}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-8 px-4 pt-5">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {rating && (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Icon name="star" className="h-4 w-4 text-warning" /> {rating}
              {branch.ratingCount ? <span className="text-foreground-subtle">({branch.ratingCount})</span> : null}
            </span>
          )}
          {distance && <span className="inline-flex items-center gap-1 text-foreground-muted"><Icon name="truck" className="h-4 w-4" /> {distance}</span>}
          {prep && <span className="inline-flex items-center gap-1 text-foreground-muted"><Icon name="clock" className="h-4 w-4" /> {prep}</span>}
          <Badge tone={status.tone} variant="soft">{status.label}</Badge>
          {branch.hours.openNow ? (
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <span className="h-2 w-2 rounded-full bg-success" /> Open{branch.hours.closesAt ? ` · closes ${branch.hours.closesAt}` : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-foreground-muted">Closed{branch.hours.opensAt ? ` · opens ${branch.hours.opensAt}` : ''}</span>
          )}
        </div>

        {branch.offer && (
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft p-3 text-sm text-success">
            <Icon name="gift" className="h-4 w-4" />
            <span className="font-medium">{branch.offer.label}</span>
            {branch.offer.description && <span className="text-success/80">— {branch.offer.description}</span>}
          </div>
        )}

        {/* Gallery */}
        {branch.gallery && branch.gallery.length > 0 && (
          <Section title="Gallery" icon="image">
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {branch.gallery.map((g, i) => (
                <img key={i} src={g.url} alt={g.alt ?? ''} loading="lazy" className="h-40 w-56 shrink-0 rounded-xl object-cover" />
              ))}
            </div>
          </Section>
        )}

        {/* About */}
        {branch.description && (
          <Section title="About" icon="info">
            <p className="text-sm leading-relaxed text-foreground-muted">{branch.description}</p>
          </Section>
        )}

        {/* Services */}
        {branch.services.length > 0 && (
          <Section title="Services" icon="bag">
            <div className="flex flex-wrap gap-2">
              {branch.services.map((s) => (
                <span
                  key={s.mode}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm',
                    s.available ? 'border-border text-foreground' : 'border-border bg-muted text-foreground-subtle line-through',
                  )}
                >
                  <Icon name={SERVICE_MODE_ICONS[s.mode]} className="h-4 w-4" />
                  {SERVICE_MODE_LABELS[s.mode]}
                  {s.available && s.etaMinutes ? <span className="text-foreground-subtle">· {s.etaMinutes} min</span> : null}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Amenities */}
        {branch.amenities && branch.amenities.length > 0 && (
          <Section title="Amenities" icon="checkCircle">
            <div className="flex flex-wrap gap-2">
              {branch.amenities.map((a) => (
                <Badge key={a} tone="neutral" variant="soft">{a}</Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Hours */}
        <Section title="Opening hours" icon="clock">
          <p className="text-sm text-foreground-muted">
            {branch.hours.openNow
              ? `Open now${branch.hours.closesAt ? ` until ${branch.hours.closesAt}` : ''}.`
              : `Currently closed${branch.hours.opensAt ? `. Opens at ${branch.hours.opensAt}` : ''}.`}
          </p>
        </Section>

        {/* Contact */}
        {(branch.phone || branch.email || branch.website) && (
          <Section title="Contact" icon="phone">
            <div className="flex flex-col gap-2 text-sm">
              {branch.phone && (
                <a href={`tel:${branch.phone}`} className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                  <Icon name="phone" className="h-4 w-4" /> {branch.phone}
                </a>
              )}
              {branch.email && (
                <a href={`mailto:${branch.email}`} className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                  <Icon name="mail" className="h-4 w-4" /> {branch.email}
                </a>
              )}
              {branch.website && (
                <a href={branch.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                  <Icon name="external" className="h-4 w-4" /> Website
                </a>
              )}
            </div>
          </Section>
        )}

        {/* Location & directions */}
        <Section title="Location" icon="store">
          {branch.address && <p className="text-sm text-foreground-muted">{branch.address}</p>}
          <MapView center={branch.location} zoom={15} markers={[{ id: branch.id, position: branch.location, title: branch.name }]} className="h-56" />
          <Button asChild variant="secondary" leftIcon="truck">
            <a href={directionsUrl} target="_blank" rel="noreferrer">Get directions</a>
          </Button>
        </Section>

        {/* Reviews placeholder (future module) */}
        <Section title="Reviews" icon="star">
          {branch.reviewsSummary ? (
            <p className="text-sm text-foreground-muted">
              <span className="font-medium text-foreground">{branch.reviewsSummary.average.toFixed(1)}</span> from {branch.reviewsSummary.count} reviews
            </p>
          ) : (
            <p className="text-sm text-foreground-subtle">Reviews are coming soon.</p>
          )}
        </Section>

        <Separator />
        <p className="text-xs text-foreground-subtle">Branch code: {branch.slug}</p>
      </div>

      {/* Sticky Order Now CTA (enters F3.2) */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{branch.name}</p>
            <p className="truncate text-xs text-foreground-muted">{canOrder ? 'Ready to take your order' : status.label}</p>
          </div>
          <Button size="lg" disabled={!canOrder} onClick={() => onOrderNow?.(branch)}>
            Order now
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Loading skeleton matching the detail layout. */
export function RestaurantDetailSkeleton() {
  return (
    <div className="pb-24">
      <Skeleton className="h-56 w-full rounded-b-3xl sm:h-72" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 pt-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}
