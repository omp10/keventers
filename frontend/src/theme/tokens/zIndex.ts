/**
 * Z-index scale — a strict, named stacking order so overlays never fight. NEVER
 * hardcode a z-index in a component; reference a layer. Ascending = on top.
 */
export const zIndex = {
  hide: -1,
  base: 0,
  raised: 10,
  sticky: 100, // sticky headers / table headers
  dropdown: 1000,
  overlay: 1100, // dialog/drawer scrim
  drawer: 1150,
  modal: 1200,
  popover: 1300, // must sit above modals (menus inside dialogs)
  tooltip: 1400,
  toast: 1500,
  command: 1600, // command palette — top of everything
  max: 2147483647,
} as const;

export type ZLayer = keyof typeof zIndex;
