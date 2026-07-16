import { useMemo } from 'react';

import { MapView, type MapMarker } from '@/platform/maps';
import { cn } from '@/lib/cn';
import type { Branch, GeoPoint } from '../types';
import { RestaurantCard } from './RestaurantCard';

/**
 * RestaurantMap — the map surface. Consumes the abstracted Maps Platform
 * (`MapView`); it never touches google.maps directly. Branch pins + an optional
 * user marker; clicking a pin selects a branch (map⇄list sync). Marker clustering
 * is future-ready via the platform. Renders the same Branch data as the list —
 * no duplicated rendering source.
 */
export function RestaurantMap({
  branches,
  activeId,
  origin,
  onActive,
  onPrefetch,
  onOpen,
  className,
}: {
  branches: Branch[];
  activeId?: string | null;
  origin?: GeoPoint | null;
  onActive?: (id: string | null) => void;
  onPrefetch?: (slug: string) => void;
  onOpen?: (branch: Branch) => void;
  className?: string;
}) {
  const markers = useMemo<MapMarker[]>(() => {
    const branchMarkers: MapMarker[] = branches.map((b) => ({
      id: b.id,
      position: b.location,
      title: b.name,
      onClick: () => onActive?.(b.id),
    }));
    if (origin) branchMarkers.push({ id: '__origin', position: origin, title: 'You are here' });
    return branchMarkers;
  }, [branches, origin, onActive]);

  const active = branches.find((b) => b.id === activeId) ?? null;
  const center = active?.location ?? origin ?? branches[0]?.location;

  return (
    <div className={cn('relative', className)}>
      <MapView markers={markers} center={center} fitToMarkers={!active && branches.length > 1} className="h-full w-full" />

      {/* Active-branch overlay card (bottom sheet style) */}
      {active && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[1] flex justify-center">
          <div className="pointer-events-auto w-full max-w-md animate-[kv-pop-in_180ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
            <RestaurantCard branch={active} variant="map" onPrefetch={onPrefetch} onOpen={onOpen} className="shadow-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
