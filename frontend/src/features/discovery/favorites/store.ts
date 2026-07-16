import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { collections } from '@/platform/discovery';
import type { Branch } from '../types';

/**
 * FAVORITES & RECENTS for branches. The platform `collections` owns the id-sets
 * (favorite ids, recent ids — reactive, localStorage-backed). This module adds a
 * small SNAPSHOT cache (id → branch) so the Favorites/Recent surfaces can render
 * cards instantly and offline, without re-fetching. Designed to later sync with
 * Customer Accounts: swap the id-set source, keep the same hooks.
 */
const NS = 'branches';
const SNAP_KEY = 'kv-branch-snapshots';
const SNAP_MAX = 60;

const localListeners = new Set<() => void>();
const emitLocal = () => localListeners.forEach((l) => l());

function readSnapshots(): Record<string, Branch> {
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Branch>) : {};
  } catch {
    return {};
  }
}

function writeSnapshot(branch: Branch) {
  try {
    const map = readSnapshots();
    map[branch.id] = branch;
    // Trim to the most recent SNAP_MAX by recents+favorites membership.
    const keep = new Set([...collections.recents(NS), ...collections.favorites(NS)]);
    const ids = Object.keys(map);
    if (ids.length > SNAP_MAX) {
      for (const id of ids) if (!keep.has(id) && Object.keys(map).length > SNAP_MAX) delete map[id];
    }
    localStorage.setItem(SNAP_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
  emitLocal();
}

/** Subscribe to BOTH the id-sets and the snapshot cache. */
function subscribeAll(fn: () => void) {
  const off = collections.subscribe(fn);
  localListeners.add(fn);
  return () => {
    off();
    localListeners.delete(fn);
  };
}

export const branchCollections = {
  recordVisit(branch: Branch) {
    collections.pushRecent(NS, branch.id);
    writeSnapshot(branch);
  },
  toggleFavorite(branch: Branch) {
    collections.toggleFavorite(NS, branch.id);
    writeSnapshot(branch);
  },
  isFavorite: (id: string) => collections.isFavorite(NS, id),
  favoriteIds: () => collections.favorites(NS),
  recentIds: () => collections.recents(NS),
  snapshots: readSnapshots,
  subscribe: subscribeAll,
};

function useSignal(): string {
  return useSyncExternalStore(
    (cb) => subscribeAll(cb),
    () => `${collections.favorites(NS).join(',')}|${collections.recents(NS).join(',')}|${Object.keys(readSnapshots()).length}`,
    () => '',
  );
}

/** Reactive favorite branches (hydrated from snapshots). */
export function useFavoriteBranches(): Branch[] {
  const signal = useSignal();
  return useMemo(() => {
    const snaps = readSnapshots();
    return collections.favorites(NS).map((id) => snaps[id]).filter(Boolean) as Branch[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);
}

/** Reactive recently-visited branches, newest first. */
export function useRecentBranches(limit = 12): Branch[] {
  const signal = useSignal();
  return useMemo(() => {
    const snaps = readSnapshots();
    return collections.recents(NS).map((id) => snaps[id]).filter(Boolean).slice(0, limit) as Branch[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal, limit]);
}

/** Reactive favorite flag + toggle for a single branch. */
export function useFavorite(branch: Branch | undefined) {
  useSignal();
  const isFavorite = branch ? collections.isFavorite(NS, branch.id) : false;
  const toggle = useCallback(() => branch && branchCollections.toggleFavorite(branch), [branch]);
  return { isFavorite, toggle };
}
