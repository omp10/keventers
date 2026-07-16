import { Button, Icon } from '@/design-system';
import type { GeoPermission } from '@/platform/location';
import { cn } from '@/lib/cn';
import type { DiscoveryOrigin } from './origin-cache';
import type { LocationStatus } from '@/platform/location';

/**
 * LocationPrompt — the reusable GPS affordance. It reflects the permission flow
 * (prompt → granted → denied) from the Location Platform and always offers a
 * manual-search fallback so a denied permission never dead-ends. Presentational:
 * the page owns `useDiscoveryOrigin` and passes state + handlers.
 */
export function LocationPrompt({
  origin,
  permission,
  status,
  onUseLocation,
  onManualSearch,
  onChange,
  className,
}: {
  origin: DiscoveryOrigin | null;
  permission: GeoPermission;
  status: LocationStatus;
  onUseLocation: () => void;
  onManualSearch: () => void;
  onChange?: () => void;
  className?: string;
}) {
  const locating = status === 'locating';

  // Located — show the resolved place with a change affordance.
  if (origin) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <Icon name="store" className="h-4 w-4 text-primary" />
        <span className="min-w-0 truncate text-foreground">
          {origin.label ?? `Near ${origin.point.lat.toFixed(3)}, ${origin.point.lng.toFixed(3)}`}
        </span>
        <Button variant="link" size="sm" onClick={onChange ?? onManualSearch}>
          Change
        </Button>
      </div>
    );
  }

  // Denied — explain + offer manual search + a retry.
  if (permission === 'denied') {
    return (
      <div className={cn('rounded-xl border border-border bg-surface p-4', className)}>
        <div className="flex items-start gap-3">
          <Icon name="wifiOff" className="mt-0.5 h-5 w-5 text-warning" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Location is off</p>
            <p className="mt-0.5 text-sm text-foreground-muted">Enable location in your browser, or search by area instead.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" leftIcon="search" onClick={onManualSearch}>
                Search an area
              </Button>
              <Button size="sm" variant="ghost" leftIcon="refresh" onClick={onUseLocation}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prompt — the primary "use my location" CTA.
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button leftIcon="store" onClick={onUseLocation} loading={locating}>
        Use my location
      </Button>
      <Button variant="ghost" leftIcon="search" onClick={onManualSearch}>
        Search an area
      </Button>
    </div>
  );
}
