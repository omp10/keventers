import { useSyncExternalStore } from 'react';

import type { ActivityItem } from '../types';

/**
 * Live activity store — realtime events (from the Socket Platform) are prepended
 * here so the recent-activity feed updates instantly without refetching. Capped;
 * seeded from the server on load, then kept live. Merge-dedup by id.
 */
const MAX = 60;
let items: ActivityItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const activityStore = {
  get: () => items,
  seed(seed: ActivityItem[]) {
    const map = new Map(seed.map((i) => [i.id, i]));
    items.forEach((i) => map.set(i.id, map.get(i.id) ?? i));
    items = [...map.values()].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, MAX);
    emit();
  },
  prepend(item: ActivityItem) {
    if (items.some((i) => i.id === item.id)) return;
    items = [item, ...items].slice(0, MAX);
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useActivityItems(): ActivityItem[] {
  return useSyncExternalStore(
    (cb) => activityStore.subscribe(cb),
    () => activityStore.get(),
    () => activityStore.get(),
  );
}
