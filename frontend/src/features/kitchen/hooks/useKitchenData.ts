import { useMemo } from 'react';

import { useQueryResource } from '@/platform/query';
import { kitchenService } from '../services';
import type { KitchenChef, KitchenEntry, KitchenMetrics, KitchenStation } from '../types';
import { KK } from './keys';

/**
 * The live kitchen queue. Kept fresh by the realtime engine — never polled.
 *
 * The board wire format carries `currentChefId` but no name, so an assigned
 * ticket would render as unassigned. The roster is already loaded and cached
 * for the assign picker, so the name is joined here rather than making the
 * backend batch-load users on every board read — and the board reads a LOT.
 */
export function useKitchenQueue() {
  const queue = useQueryResource<KitchenEntry[]>(KK.queue(), () => kitchenService.queue(), { staleTime: 10_000 });
  const chefs = useChefs();

  const data = useMemo(() => {
    if (!queue.data) return queue.data;
    if (!chefs.data?.length) return queue.data;
    const byId = new Map(chefs.data.map((c) => [c.id, c]));
    return queue.data.map((e) => {
      if (e.chef?.name || !e.currentChefId) return e;
      const chef = byId.get(e.currentChefId);
      return chef ? { ...e, chef: { id: chef.id, name: chef.name } } : e;
    });
  }, [queue.data, chefs.data]);

  return { ...queue, data };
}

export function useKitchenEntry(orderId: string | undefined) {
  return useQueryResource<KitchenEntry>(KK.entry(orderId), () => kitchenService.get(orderId!), { enabled: Boolean(orderId) });
}

export function useStations() {
  return useQueryResource<KitchenStation[]>(KK.stations(), () => kitchenService.stations(), { staleTime: 30_000 });
}

export function useChefs() {
  return useQueryResource<KitchenChef[]>(KK.chefs(), () => kitchenService.chefs(), { staleTime: 30_000 });
}

export function useKitchenMetrics() {
  return useQueryResource<KitchenMetrics>(KK.metrics(), () => kitchenService.metrics(), { staleTime: 15_000 });
}
