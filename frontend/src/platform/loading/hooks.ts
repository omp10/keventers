import { useCallback } from 'react';

import { selectIsLoading, useLoadingStore } from './store';

/** Imperative access to the global loading manager. */
export function useLoading() {
  const begin = useLoadingStore((s) => s.begin);
  const end = useLoadingStore((s) => s.end);
  const isLoading = useLoadingStore(selectIsLoading);

  /** Run a promise while a loading task is active; always ends, even on error. */
  const withLoading = useCallback(
    async <T,>(promise: Promise<T>, key?: string): Promise<T> => {
      const id = begin(key);
      try {
        return await promise;
      } finally {
        end(id);
      }
    },
    [begin, end],
  );

  return { begin, end, isLoading, withLoading };
}
