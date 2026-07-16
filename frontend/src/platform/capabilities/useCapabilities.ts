import { useSyncExternalStore } from 'react';

import { capabilityStore, type Capabilities } from './capabilities';

/**
 * useCapabilities — reactive access to the device's capabilities. Recomputes when
 * the user rotates, plugs in a mouse, goes offline, toggles reduced-motion, etc.
 */
export function useCapabilities(): Capabilities {
  return useSyncExternalStore(
    (cb) => capabilityStore.subscribe(cb),
    () => capabilityStore.get(),
    () => capabilityStore.get(),
  );
}

/** Read a single capability flag. */
export function useCapability<K extends keyof Capabilities>(key: K): Capabilities[K] {
  return useCapabilities()[key];
}

/** True when the viewer prefers reduced motion — gate premium animations on this. */
export function useReducedMotion(): boolean {
  return useCapability('reducedMotion');
}
