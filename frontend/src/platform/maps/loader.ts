import { Loader, type Library } from '@googlemaps/js-api-loader';

import { env } from '@/config/env';

/**
 * MAPS PLATFORM — the ONLY place the Google Maps SDK is loaded. Components never
 * import `@googlemaps/*` or touch `window.google` directly; they go through the
 * MapsProvider + hooks. This centralizes the API key, the loaded libraries, and
 * the "is the SDK ready" state, and keeps the app swappable to another provider.
 */
export type MapsNamespace = typeof google.maps;

const LIBRARIES: Library[] = ['maps', 'places', 'geocoding', 'marker'];

let loaderPromise: Promise<MapsNamespace> | null = null;

export function isMapsConfigured(): boolean {
  return Boolean(env.maps.apiKey);
}

/** Load (once) and resolve the Google Maps namespace. Rejects if no API key. */
export function loadGoogleMaps(): Promise<MapsNamespace> {
  if (!isMapsConfigured()) {
    return Promise.reject(new Error('Google Maps API key is not configured (VITE_GOOGLE_MAPS_API_KEY).'));
  }
  if (loaderPromise) return loaderPromise;

  const loader = new Loader({ apiKey: env.maps.apiKey, version: 'weekly', libraries: LIBRARIES });
  loaderPromise = loader.load().then((g) => g.maps);
  return loaderPromise;
}
