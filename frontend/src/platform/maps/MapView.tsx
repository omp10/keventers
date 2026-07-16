import { useEffect, useRef, type CSSProperties } from 'react';

import { cn } from '@/lib/cn';
import { Spinner, OfflineState } from '@/design-system';
import type { Coordinates } from '@/platform/location';
import { useMaps, mapDefaults } from './useMaps';

export type MapMarker = { id: string; position: Coordinates; title?: string; onClick?: () => void };

export type MapViewProps = {
  center?: Coordinates;
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  style?: CSSProperties;
  onReady?: (map: google.maps.Map) => void;
  /** Auto-fit the viewport to the given markers. */
  fitToMarkers?: boolean;
};

/**
 * MapView — the reusable, declarative map surface. Pages pass center/zoom/markers;
 * they never construct `google.maps.Map` themselves. Renders graceful fallbacks
 * while loading or when maps are unconfigured.
 */
export function MapView({ center, zoom, markers = [], className, style, onReady, fitToMarkers }: MapViewProps) {
  const { status, maps } = useMaps();
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);

  // Create the map once the SDK + element are ready.
  useEffect(() => {
    if (!maps || !elRef.current || mapRef.current) return;
    mapRef.current = new maps.Map(elRef.current, {
      center: center ?? mapDefaults.center,
      zoom: zoom ?? mapDefaults.zoom,
      disableDefaultUI: false,
      clickableIcons: false,
    });
    onReady?.(mapRef.current);
  }, [maps, center, zoom, onReady]);

  // Keep center/zoom in sync.
  useEffect(() => {
    if (mapRef.current && center) mapRef.current.setCenter(center);
  }, [center]);
  useEffect(() => {
    if (mapRef.current && zoom != null) mapRef.current.setZoom(zoom);
  }, [zoom]);

  // Sync markers.
  useEffect(() => {
    if (!maps || !mapRef.current) return;
    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current = markers.map((m) => {
      const marker = new maps.Marker({ position: m.position, map: mapRef.current!, title: m.title });
      if (m.onClick) marker.addListener('click', m.onClick);
      return marker;
    });
    if (fitToMarkers && markers.length) {
      const bounds = new maps.LatLngBounds();
      markers.forEach((m) => bounds.extend(m.position));
      mapRef.current.fitBounds(bounds);
    }
  }, [maps, markers, fitToMarkers]);

  if (status === 'unconfigured' || status === 'error') {
    return (
      <div className={cn('flex items-center justify-center rounded-xl border border-border bg-muted/30 p-6', className)} style={style}>
        <OfflineState title="Map unavailable" description="Location preview can't be shown right now." />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-border', className)} style={style}>
      <div ref={elRef} className="h-full w-full" style={{ minHeight: 240 }} />
      {status !== 'ready' && (
        <div className="absolute inset-0 grid place-items-center bg-muted/40">
          <Spinner />
        </div>
      )}
    </div>
  );
}
