import { useState } from 'react';

import { Icon, Spinner, EmptyState } from '@/design-system';
import { ProductCard } from '../components';
import { useMenuSearch } from '../hooks';
import type { Product } from '../types';

/**
 * MenuSearch — a full-screen menu search overlay. Debounced via `useMenuSearch`;
 * results reuse the ProductCard. Rendered by the menu page when search is opened.
 */
export function MenuSearch({
  branchSlug,
  onAdd,
  onOpen,
  onClose,
}: {
  branchSlug: string;
  onAdd: (p: Product) => void;
  onOpen: (p: Product) => void;
  onClose: () => void;
}) {
  const [term, setTerm] = useState('');
  const { results, isSearching } = useMenuSearch(branchSlug, term);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <button type="button" aria-label="Close search" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-foreground-muted hover:bg-muted">
          <Icon name="arrowLeft" className="h-5 w-5" />
        </button>
        <div className="relative flex flex-1 items-center">
          <Icon name="search" className="pointer-events-none absolute left-3 h-4 w-4 text-foreground-subtle" />
          <input
            autoFocus
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search this menu…"
            className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-[0.9375rem] outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {isSearching && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
        {!isSearching && term.length >= 2 && results.length === 0 && (
          <EmptyState icon={<Icon name="search" className="mb-3 h-8 w-8 text-muted-foreground" />} title="No matches" description="Try a different dish or ingredient." size="sm" />
        )}
        {results.map((p) => (
          <ProductCard key={p.id} product={p} variant="list" onAdd={onAdd} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}
