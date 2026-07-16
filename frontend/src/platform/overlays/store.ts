import type { ReactNode } from 'react';
import { create } from 'zustand';

/**
 * OVERLAY PLATFORM — imperative modal + drawer managers. Instead of every page
 * juggling `open` state, call `modals.open({...})` / `drawers.open({...})` from
 * anywhere (even outside React). A single host renders them, so overlays stack and
 * animate consistently. Content is a render-fn receiving `close`.
 */
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl';
export type DrawerSide = 'left' | 'right' | 'top' | 'bottom';

export type ModalOptions = {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  content: ReactNode | ((close: () => void) => ReactNode);
  size?: OverlaySize;
  dismissible?: boolean;
  onClose?: () => void;
};

export type DrawerOptions = {
  id?: string;
  title?: ReactNode;
  content: ReactNode | ((close: () => void) => ReactNode);
  side?: DrawerSide;
  dismissible?: boolean;
  onClose?: () => void;
};

type OverlayEntry<T> = T & { id: string };

type OverlayState = {
  modals: OverlayEntry<ModalOptions>[];
  drawers: OverlayEntry<DrawerOptions>[];
  openModal: (opts: ModalOptions) => string;
  closeModal: (id: string) => void;
  openDrawer: (opts: DrawerOptions) => string;
  closeDrawer: (id: string) => void;
  closeAll: () => void;
};

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

export const useOverlayStore = create<OverlayState>((set, get) => ({
  modals: [],
  drawers: [],
  openModal: (opts) => {
    const id = opts.id ?? nextId('modal');
    set((s) => ({ modals: [...s.modals.filter((m) => m.id !== id), { ...opts, id }] }));
    return id;
  },
  closeModal: (id) => {
    get().modals.find((m) => m.id === id)?.onClose?.();
    set((s) => ({ modals: s.modals.filter((m) => m.id !== id) }));
  },
  openDrawer: (opts) => {
    const id = opts.id ?? nextId('drawer');
    set((s) => ({ drawers: [...s.drawers.filter((d) => d.id !== id), { ...opts, id }] }));
    return id;
  },
  closeDrawer: (id) => {
    get().drawers.find((d) => d.id === id)?.onClose?.();
    set((s) => ({ drawers: s.drawers.filter((d) => d.id !== id) }));
  },
  closeAll: () => set({ modals: [], drawers: [] }),
}));

/** Imperative, React-free entry points (like `toast`). */
export const modals = {
  open: (opts: ModalOptions) => useOverlayStore.getState().openModal(opts),
  close: (id: string) => useOverlayStore.getState().closeModal(id),
  closeAll: () => useOverlayStore.getState().closeAll(),
};

export const drawers = {
  open: (opts: DrawerOptions) => useOverlayStore.getState().openDrawer(opts),
  close: (id: string) => useOverlayStore.getState().closeDrawer(id),
  closeAll: () => useOverlayStore.getState().closeAll(),
};
