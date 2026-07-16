/**
 * LOCATION PLATFORM — the single wrapper over the browser Geolocation API. No
 * component calls `navigator.geolocation` directly; they use `useLocation`. This
 * keeps permission handling, error mapping, and fallbacks in one place.
 */
export type Coordinates = { lat: number; lng: number; accuracy?: number };

export type GeoErrorKind = 'permission-denied' | 'unavailable' | 'timeout' | 'unsupported';

export class GeoError extends Error {
  kind: GeoErrorKind;
  constructor(kind: GeoErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'GeoError';
    this.kind = kind;
  }
}

export type GeoPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

const DEFAULT_OPTS: PositionOptions = { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 };

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

function mapError(err: GeolocationPositionError): GeoError {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return new GeoError('permission-denied', 'Location permission was denied.');
    case err.POSITION_UNAVAILABLE:
      return new GeoError('unavailable', 'Location is currently unavailable.');
    case err.TIMEOUT:
      return new GeoError('timeout', 'Timed out getting your location.');
    default:
      return new GeoError('unavailable', err.message);
  }
}

const toCoords = (p: GeolocationPosition): Coordinates => ({
  lat: p.coords.latitude,
  lng: p.coords.longitude,
  accuracy: p.coords.accuracy,
});

export function getCurrentPosition(options?: PositionOptions): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) return reject(new GeoError('unsupported', 'Geolocation is not supported.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(toCoords(p)),
      (e) => reject(mapError(e)),
      { ...DEFAULT_OPTS, ...options },
    );
  });
}

export function watchPosition(
  onChange: (coords: Coordinates) => void,
  onError?: (err: GeoError) => void,
  options?: PositionOptions,
): () => void {
  if (!isGeolocationSupported()) {
    onError?.(new GeoError('unsupported'));
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (p) => onChange(toCoords(p)),
    (e) => onError?.(mapError(e)),
    { ...DEFAULT_OPTS, ...options },
  );
  return () => navigator.geolocation.clearWatch(id);
}

export async function queryPermission(): Promise<GeoPermission> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state as GeoPermission;
  } catch {
    return 'unknown';
  }
}

/** Haversine distance in metres — handy for "nearby" sorting without the Maps SDK. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
