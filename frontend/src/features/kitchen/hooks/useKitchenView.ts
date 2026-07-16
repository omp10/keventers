import { create } from 'zustand';

import type { KitchenEntry, KitchenFilterState } from '../types';

/**
 * useKitchenView — the shared KDS view/filter state (search, station, chef,
 * priority, status). The immersive topbar edits it; the board reads it. Filtering
 * is presentation only (the full realtime queue is fetched once and filtered
 * client-side), so changing filters never refetches or disrupts realtime.
 */
type KitchenViewState = KitchenFilterState & {
  patch: (p: Partial<KitchenFilterState>) => void;
  reset: () => void;
  hasActive: () => boolean;
};

export const useKitchenView = create<KitchenViewState>((set, get) => ({
  patch: (p) => set(p),
  reset: () => set({ search: undefined, stationId: undefined, chefId: undefined, priority: undefined, status: undefined, channel: undefined }),
  hasActive: () => {
    const s = get();
    return Boolean(s.search || s.stationId || s.chefId || s.priority || s.status || s.channel);
  },
}));

/** Pure client-side filter of the queue by the current view state. */
export function filterEntries(entries: KitchenEntry[], f: KitchenFilterState): KitchenEntry[] {
  const q = f.search?.trim().toLowerCase();
  return entries.filter((e) => {
    if (f.stationId && e.station?.id !== f.stationId) return false;
    if (f.chefId && e.chef?.id !== f.chefId) return false;
    if (f.priority && e.priority !== f.priority) return false;
    if (f.status && e.status !== f.status) return false;
    if (f.channel && e.channel !== f.channel) return false;
    if (q) {
      const hay = [e.orderNumber, e.tableLabel, e.station?.name, e.chef?.name, ...(e.items ?? []).map((i) => i.name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
