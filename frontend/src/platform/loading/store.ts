import { create } from 'zustand';

/**
 * LOADING PLATFORM — a single global loading manager. Async work registers a named
 * task (`begin(key)` → `end(key)`); the shell reflects "is anything loading" via a
 * top progress bar. Keyed so concurrent tasks don't clobber each other. Data
 * fetching still lives in TanStack Query — this is for cross-cutting UX signals
 * (route transitions, blocking actions).
 */
type LoadingState = {
  tasks: Record<string, number>;
  begin: (key?: string) => string;
  end: (key: string) => void;
  isLoading: () => boolean;
  reset: () => void;
};

let counter = 0;

export const useLoadingStore = create<LoadingState>((set, get) => ({
  tasks: {},
  begin: (key) => {
    const id = key ?? `task-${++counter}`;
    set((s) => ({ tasks: { ...s.tasks, [id]: (s.tasks[id] ?? 0) + 1 } }));
    return id;
  },
  end: (key) =>
    set((s) => {
      const next = { ...s.tasks };
      const remaining = (next[key] ?? 0) - 1;
      if (remaining <= 0) delete next[key];
      else next[key] = remaining;
      return { tasks: next };
    }),
  isLoading: () => Object.keys(get().tasks).length > 0,
  reset: () => set({ tasks: {} }),
}));

export const selectIsLoading = (s: LoadingState) => Object.keys(s.tasks).length > 0;
