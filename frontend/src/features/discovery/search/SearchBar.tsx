import { useId, useRef, useState } from 'react';

import { Icon, Spinner } from '@/design-system';
import { cn } from '@/lib/cn';
import { useDiscoverySearch } from '../hooks';
import type { GeoPoint, PlaceSuggestion } from '../types';

const KIND_ICON = {
  area: 'store',
  city: 'store',
  cuisine: 'utensils',
  restaurant: 'utensils',
  branch: 'store',
} as const;

/**
 * SearchBar — discovery search input with debounced backend autocomplete. It's
 * presentational + reusable: the parent decides what a submit / suggestion means
 * (navigate to search, open a branch, set an area as origin). The search
 * architecture is extensible — new suggestion kinds render with no change here.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  onSelect,
  origin,
  placeholder = 'Search restaurants, cuisines, areas…',
  autoFocus,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (term: string) => void;
  onSelect?: (s: PlaceSuggestion) => void;
  origin?: GeoPoint | null;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const { suggestions, isSearching } = useDiscoverySearch(value, origin);

  const showList = open && (suggestions.length > 0 || isSearching);

  const choose = (s: PlaceSuggestion) => {
    setOpen(false);
    onSelect?.(s);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (e.key === 'Enter') {
      if (highlight >= 0 && suggestions[highlight]) choose(suggestions[highlight]);
      else {
        setOpen(false);
        onSubmit?.(value.trim());
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative flex items-center">
        <Icon name="search" className="pointer-events-none absolute left-3.5 h-4 w-4 text-foreground-subtle" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-10 text-[0.9375rem] text-foreground shadow-sm outline-none transition placeholder:text-foreground-subtle focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 grid h-6 w-6 place-items-center rounded-full text-foreground-subtle hover:bg-muted hover:text-foreground"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl"
        >
          {isSearching && suggestions.length === 0 && (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground-muted">
              <Spinner /> Searching…
            </li>
          )}
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm',
                  i === highlight ? 'bg-primary-soft text-primary' : 'text-foreground hover:bg-muted',
                )}
              >
                <Icon name={KIND_ICON[s.kind]} className="h-4 w-4 shrink-0 text-foreground-muted" />
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <span className="shrink-0 text-xs capitalize text-foreground-subtle">{s.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
