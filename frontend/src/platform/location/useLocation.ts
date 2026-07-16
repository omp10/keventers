import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getCurrentPosition,
  isGeolocationSupported,
  queryPermission,
  watchPosition,
  type Coordinates,
  type GeoError,
  type GeoPermission,
} from './geolocation';

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'error';

/**
 * useLocation — the reusable hook for reading the user's position. It exposes
 * status, coordinates, permission, and imperative `request()`/`watch()`, so pages
 * never touch the Geolocation API. Nothing is requested until you call `request()`
 * (or pass `immediate`), respecting the permission prompt UX.
 */
export function useLocation(opts?: { immediate?: boolean; options?: PositionOptions }) {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<GeoError | null>(null);
  const [permission, setPermission] = useState<GeoPermission>('unknown');
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    void queryPermission().then(setPermission);
  }, []);

  const request = useCallback(async () => {
    setStatus('locating');
    setError(null);
    try {
      const c = await getCurrentPosition(opts?.options);
      setCoords(c);
      setStatus('ready');
      setPermission('granted');
      return c;
    } catch (e) {
      setError(e as GeoError);
      setStatus('error');
      if ((e as GeoError).kind === 'permission-denied') setPermission('denied');
      throw e;
    }
  }, [opts?.options]);

  const watch = useCallback(() => {
    stopRef.current?.();
    setStatus('locating');
    stopRef.current = watchPosition(
      (c) => {
        setCoords(c);
        setStatus('ready');
      },
      (e) => {
        setError(e);
        setStatus('error');
      },
      opts?.options,
    );
    return () => stopRef.current?.();
  }, [opts?.options]);

  useEffect(() => {
    if (opts?.immediate) void request().catch(() => {});
    return () => stopRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { coords, status, error, permission, supported: isGeolocationSupported(), request, watch };
}
