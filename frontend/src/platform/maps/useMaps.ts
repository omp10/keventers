import { useCallback, useEffect, useState } from 'react';

import { env } from '@/config/env';
import type { Coordinates } from '@/platform/location';
import { loadGoogleMaps, type MapsNamespace } from './loader';
import { useMapsContext, type MapsStatus } from './MapsProvider';

/**
 * useMaps — ensures the SDK is loaded and returns it. If the provider was mounted
 * lazily (eager=false), the first component that needs maps triggers the load.
 */
export function useMaps(): { status: MapsStatus; maps: MapsNamespace | null; error: Error | null } {
  const ctx = useMapsContext();
  const [local, setLocal] = useState<{ status: MapsStatus; maps: MapsNamespace | null; error: Error | null }>({
    status: ctx.status,
    maps: ctx.maps,
    error: ctx.error,
  });

  useEffect(() => {
    if (ctx.maps || ctx.status === 'unconfigured') {
      setLocal({ status: ctx.status, maps: ctx.maps, error: ctx.error });
      return;
    }
    let alive = true;
    setLocal((s) => ({ ...s, status: 'loading' }));
    loadGoogleMaps()
      .then((m) => alive && setLocal({ status: 'ready', maps: m, error: null }))
      .catch((e: Error) => alive && setLocal({ status: 'error', maps: null, error: e }));
    return () => {
      alive = false;
    };
  }, [ctx.maps, ctx.status, ctx.error]);

  return local;
}

/** Forward + reverse geocoding, abstracted so callers never touch google.maps. */
export function useGeocoder() {
  const { maps } = useMaps();

  const geocode = useCallback(
    async (address: string): Promise<Coordinates | null> => {
      if (!maps) return null;
      const geocoder = new maps.Geocoder();
      const { results } = await geocoder.geocode({ address });
      const loc = results[0]?.geometry.location;
      return loc ? { lat: loc.lat(), lng: loc.lng() } : null;
    },
    [maps],
  );

  const reverseGeocode = useCallback(
    async (coords: Coordinates): Promise<string | null> => {
      if (!maps) return null;
      const geocoder = new maps.Geocoder();
      const { results } = await geocoder.geocode({ location: coords });
      return results[0]?.formatted_address ?? null;
    },
    [maps],
  );

  return { geocode, reverseGeocode, ready: Boolean(maps) };
}

export const mapDefaults = { center: env.maps.defaultCenter, zoom: env.maps.defaultZoom };
