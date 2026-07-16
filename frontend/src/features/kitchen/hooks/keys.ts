import { qk } from '@/platform/query';

/** Centralized KDS query keys (precise realtime invalidation). */
export const KK = {
  queue: () => qk('kitchen', 'queue'),
  entry: (orderId?: string) => qk('kitchen', 'entry', orderId ?? null),
  stations: () => qk('kitchen', 'stations'),
  chefs: () => qk('kitchen', 'chefs'),
  metrics: () => qk('kitchen', 'metrics'),
  scope: () => qk('kitchen'),
};
