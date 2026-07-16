import { useCallback, useEffect, useState } from 'react';

import { useLocation } from '@/platform/location';
import { useGeocoder } from '@/platform/maps';
import type { GeoPoint } from '../types';
import { clearOrigin, readOrigin, writeOrigin, type DiscoveryOrigin } from './origin-cache';

/**
 * useDiscoveryOrigin — the reusable "where is the user" hook for discovery. It
 * wraps the Location Platform (GPS + permission) and the Maps Platform (reverse
 * geocode for a friendly label), and caches the last-known origin so returning
 * users get instant nearby results. Components never touch geolocation directly.
 */
export function useDiscoveryOrigin() {
  const location = useLocation();
  const { reverseGeocode } = useGeocoder();
  const [origin, setOrigin] = useState<DiscoveryOrigin | null>(() => readOrigin());

  const persist = useCallback((next: DiscoveryOrigin | null) => {
    setOrigin(next);
    if (next) writeOrigin(next);
    else clearOrigin();
  }, []);

  const label = useCallback(
    async (point: GeoPoint): Promise<string | undefined> => {
      try {
        return (await reverseGeocode(point)) ?? undefined;
      } catch {
        return undefined;
      }
    },
    [reverseGeocode],
  );

  /** Ask for GPS, resolve a friendly label, and cache it. Returns the origin. */
  const requestGps = useCallback(async (): Promise<DiscoveryOrigin | null> => {
    const coords = await location.request().catch(() => null);
    if (!coords) return null;
    const point: GeoPoint = { lat: coords.lat, lng: coords.lng };
    const next: DiscoveryOrigin = { point, source: 'gps', at: Date.now() };
    persist(next);
    void label(point).then((l) => l && persist({ ...next, label: l }));
    return next;
  }, [location, persist, label]);

  /** Set an origin from a manual search selection (e.g. an autocomplete place). */
  const setManualOrigin = useCallback(
    (point: GeoPoint, placeLabel?: string) => {
      persist({ point, label: placeLabel, source: 'manual', at: Date.now() });
    },
    [persist],
  );

  const clear = useCallback(() => persist(null), [persist]);

  // If a live location arrives (e.g. from a background watch), keep cache warm.
  useEffect(() => {
    if (location.status === 'ready' && location.coords && origin?.source !== 'manual') {
      const point = { lat: location.coords.lat, lng: location.coords.lng };
      if (!origin || origin.point.lat !== point.lat || origin.point.lng !== point.lng) {
        persist({ point, source: 'gps', at: Date.now(), label: origin?.label });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.status]);

  return {
    origin,
    point: origin?.point ?? null,
    permission: location.permission,
    status: location.status,
    supported: location.supported,
    error: location.error,
    requestGps,
    setManualOrigin,
    clear,
  };
}
