import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI store (Zustand) — cross-cutting, presentation-only UI state shared by the
 * shells: sidebar collapse, mobile nav, command-palette open. Persisted bits
 * (sidebar preference) survive reloads. Business/data state lives in TanStack
 * Query, NOT here.
 */
type UIState = {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setMobileNavOpen: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  toggleCommand: () => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      commandOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
      setCommandOpen: (v) => set({ commandOpen: v }),
      toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
    }),
    { name: 'kv-ui', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
);
