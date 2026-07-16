import { useCallback, useSyncExternalStore } from 'react';

/**
 * Client-side favorites + recents, namespaced (e.g. 'restaurants', 'products').
 * A local fallback when the backend doesn't persist these; apps can ignore it and
 * use server data instead. Backed by localStorage, reactive via subscriptions.
 */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function write(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* ignore quota / private mode */
  }
  emit();
}

const favKey = (ns: string) => `kv-fav-${ns}`;
const recentKey = (ns: string) => `kv-recent-${ns}`;
const RECENT_MAX = 20;

export const collections = {
  favorites: (ns: string) => read(favKey(ns)),
  isFavorite: (ns: string, id: string) => read(favKey(ns)).includes(id),
  toggleFavorite: (ns: string, id: string) => {
    const cur = read(favKey(ns));
    write(favKey(ns), cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur]);
  },
  recents: (ns: string) => read(recentKey(ns)),
  pushRecent: (ns: string, id: string) => {
    write(recentKey(ns), [id, ...read(recentKey(ns)).filter((x) => x !== id)].slice(0, RECENT_MAX));
  },
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/** Reactive favorites for a namespace. */
export function useFavorites(ns: string) {
  const ids = useSyncExternalStore(
    (cb) => collections.subscribe(cb),
    () => JSON.stringify(collections.favorites(ns)),
    () => JSON.stringify(collections.favorites(ns)),
  );
  const toggle = useCallback((id: string) => collections.toggleFavorite(ns, id), [ns]);
  const isFavorite = useCallback((id: string) => collections.isFavorite(ns, id), [ns]);
  return { favorites: JSON.parse(ids) as string[], toggle, isFavorite };
}
