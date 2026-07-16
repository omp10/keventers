/**
 * PLATFORM — the umbrella barrel for the entire frontend platform layer. Every
 * reusable client capability lives under `@/platform/*`; import from the specific
 * sub-barrel (e.g. `@/platform/auth`) or from here.
 *
 * Business code composes these; it never re-implements HTTP, sockets, auth,
 * permissions, flags, maps, etc. This is the infrastructure the apps stand on.
 */
export * from './api';
export * from './capabilities';
export * from './auth';
export * from './permissions';
export * from './feature-flags';
export * from './query';
export * from './socket';
export * from './offline';
export * from './notifications';
export * from './search';
export * from './command';
export * from './location';
export * from './maps';
export * from './scanner';
export * from './discovery';
export * from './analytics';
export * from './error';
export * from './loading';
export * from './overlays';

// `useRealtimeQuery` is exported by both `query` (convenience re-export) and its
// canonical home `socket`; name it explicitly so the umbrella doesn't drop it.
export { useRealtimeQuery } from './socket';
