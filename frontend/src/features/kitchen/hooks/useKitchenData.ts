import { useQueryResource } from '@/platform/query';
import { kitchenService } from '../services';
import type { KitchenChef, KitchenEntry, KitchenMetrics, KitchenStation } from '../types';
import { KK } from './keys';

/** The live kitchen queue. Kept fresh by the realtime engine — never polled. */
export function useKitchenQueue() {
  return useQueryResource<KitchenEntry[]>(KK.queue(), () => kitchenService.queue(), { staleTime: 10_000 });
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
