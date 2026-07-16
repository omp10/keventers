import { modals, drawers } from './store';

/** Imperative modal manager (also usable outside React via the `modals` export). */
export function useModals() {
  return modals;
}

/** Imperative drawer manager (also usable outside React via the `drawers` export). */
export function useDrawers() {
  return drawers;
}
