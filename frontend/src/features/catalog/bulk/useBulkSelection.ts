import { useCallback, useMemo, useState } from 'react';

/**
 * useBulkSelection — a reusable multi-select for any catalog list (products,
 * categories, variants, modifiers, add-ons). Returns selection state + helpers; the
 * page pairs it with the BulkActionBar. Entity-agnostic on purpose.
 */
export function useBulkSelection() {
  const [set, setSet] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSet((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => setSet(new Set(ids)), []);
  const clear = useCallback(() => setSet(new Set()), []);
  const isSelected = useCallback((id: string) => set.has(id), [set]);

  return useMemo(
    () => ({
      ids: [...set],
      count: set.size,
      isSelected,
      toggle,
      selectAll,
      clear,
      /** True when every id in `all` is selected. */
      allSelected: (all: string[]) => all.length > 0 && all.every((id) => set.has(id)),
    }),
    [set, isSelected, toggle, selectAll, clear],
  );
}
