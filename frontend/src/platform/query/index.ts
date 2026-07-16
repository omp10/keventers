/** REACT QUERY PLATFORM — reusable resource hooks + key factory. */
export {
  useQueryResource, usePaginatedResource, useInfiniteResource,
  useMutationResource, useOptimisticMutation, useInvalidate,
} from './hooks';
export { qk, qkScope, type QueryKeyParts } from './keys';
export { queryClient } from '@/lib/query-client';
/** Realtime-bound query lives in the socket platform (it needs the socket). */
export { useRealtimeQuery } from '@/platform/socket';
