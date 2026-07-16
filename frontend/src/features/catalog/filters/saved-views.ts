import { useSyncExternalStore } from 'react';

/**
 * Generic saved views — named filter presets, scoped by a key (e.g. 'products',
 * 'categories'), persisted locally. Reactive. Any catalog list reuses this.
 */
export type SavedView<F = unknown> = { id: string; name: string; filters: F };

const key = (scope: string) => `kv-catalog-views-${scope}`;
const listeners = new Set<() => void>();

function read<F>(scope: string): SavedView<F>[] {
  try {
    const raw = localStorage.getItem(key(scope));
    return raw ? (JSON.parse(raw) as SavedView<F>[]) : [];
  } catch {
    return [];
  }
}
function write<F>(scope: string, views: SavedView<F>[]) {
  try {
    localStorage.setItem(key(scope), JSON.stringify(views));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const savedViews = {
  all: read,
  add<F>(scope: string, name: string, filters: F) {
    write(scope, [...read<F>(scope), { id: `view-${Date.now()}`, name, filters }]);
  },
  remove(scope: string, id: string) {
    write(scope, read(scope).filter((v) => v.id !== id));
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useSavedViews<F = unknown>(scope: string): SavedView<F>[] {
  const signal = useSyncExternalStore(
    (cb) => savedViews.subscribe(cb),
    () => JSON.stringify(savedViews.all<F>(scope)),
    () => '[]',
  );
  return JSON.parse(signal) as SavedView<F>[];
}
