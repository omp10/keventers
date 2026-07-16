import type { GeoPoint } from '../types';

/**
 * Persistent last-known discovery origin — so a returning visitor sees nearby
 * results instantly without re-prompting for GPS. Purely a cache over
 * localStorage; the Location Platform remains the source of live coordinates.
 */
export type DiscoveryOrigin = {
  point: GeoPoint;
  label?: string;
  /** 'gps' | 'manual' | 'ip' — how it was obtained. */
  source: 'gps' | 'manual';
  /** epoch ms; callers may treat stale origins differently. */
  at: number;
};

const KEY = 'kv-discovery-origin';

export function readOrigin(): DiscoveryOrigin | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DiscoveryOrigin) : null;
  } catch {
    return null;
  }
}

export function writeOrigin(origin: DiscoveryOrigin): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(origin));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearOrigin(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
