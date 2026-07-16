import { useSyncExternalStore } from 'react';

import type { OrderFilters } from '../services';

/**
 * Saved views — named filter presets, persisted locally. Reactive store so the
 * filter bar updates when views are added/removed. Future filters plug in via the
 * same OrderFilters shape — no redesign.
 */
export type SavedView = { id: string; name: string; filters: OrderFilters };

const KEY = 'kv-staff-order-views';
const listeners = new Set<() => void>();

function read(): SavedView[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch {
    return [];
  }
}
function write(views: SavedView[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(views));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const savedViews = {
  all: read,
  add(name: string, filters: OrderFilters) {
    const id = `view-${Date.now()}`;
    write([...read(), { id, name, filters }]);
    return id;
  },
  remove(id: string) {
    write(read().filter((v) => v.id !== id));
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useSavedViews(): SavedView[] {
  const signal = useSyncExternalStore(
    (cb) => savedViews.subscribe(cb),
    () => JSON.stringify(savedViews.all()),
    () => '[]',
  );
  return JSON.parse(signal) as SavedView[];
}
