import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { Icon, Spinner } from '@/design-system';
import { transitions } from '@/animations';
import { cn } from '@/lib/cn';
import { useDiscoverySearch } from '../hooks';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from './recent-searches';
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
 *
 * Premium touches: brand-glow focus state, an animated dropdown, and — before
 * the user types — recent searches (local, clearable) plus optional trending
 * terms supplied by the parent from already-loaded data.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  onSelect,
  origin,
  trendingTerms,
  placeholder = 'Search restaurants, cuisines, areas…',
  autoFocus,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (term: string) => void;
  onSelect?: (s: PlaceSuggestion) => void;
  origin?: GeoPoint | null;
  /** Optional trending terms (parent derives from loaded data — no endpoint). */
  trendingTerms?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [recentsTick, setRecentsTick] = useState(0);
  const { suggestions, isSearching } = useDiscoverySearch(value, origin);

  const idle = value.trim().length < 2;
  const recents = idle && open ? getRecentSearches() : [];
  const trending = idle ? (trendingTerms ?? []).slice(0, 6) : [];
  const showSuggestions = open && !idle && (suggestions.length > 0 || isSearching);
  const showIdlePanel = open && idle && (recents.length > 0 || trending.length > 0);
  const showList = showSuggestions || showIdlePanel;

  const submitTerm = (t: string) => {
    const term = t.trim();
    if (!term) return;
    addRecentSearch(term);
    setOpen(false);
    onSubmit?.(term);
  };

  const choose = (s: PlaceSuggestion) => {
    addRecentSearch(s.label);
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
      else submitTerm(value);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'group/search relative flex items-center rounded-xl transition-shadow',
          'focus-within:shadow-glow motion-reduce:transition-none',
        )}
      >
        <Icon
          name="search"
          className="pointer-events-none absolute left-3.5 h-4 w-4 text-foreground-subtle transition-colors group-focus-within/search:text-primary motion-reduce:transition-none"
        />
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

      <AnimatePresence>
        {showList && (
          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: -4, scale: 0.99 }}
            animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: -4, transition: transitions.fast }}
            transition={transitions.default}
            className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
          >
            {showSuggestions ? (
              <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto p-1.5">
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
            ) : (
              <div id={listId} className="space-y-3 p-3">
                {recents.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between px-1">
                      <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-foreground-subtle">Recent</p>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          clearRecentSearches();
                          setRecentsTick(recentsTick + 1);
                        }}
                        className="rounded text-xs font-medium text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Clear
                      </button>
                    </div>
                    <ul>
                      {recents.map((t) => (
                        <li key={t}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              onChange(t);
                              submitTerm(t);
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-foreground hover:bg-muted"
                          >
                            <Icon name="clock" className="h-4 w-4 shrink-0 text-foreground-subtle" />
                            <span className="min-w-0 flex-1 truncate">{t}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {trending.length > 0 && (
                  <div>
                    <p className="mb-1.5 px-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-foreground-subtle">
                      Trending near you
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {trending.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            onChange(t);
                            submitTerm(t);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-primary-soft hover:text-primary"
                        >
                          <Icon name="trend" className="h-3 w-3" />
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
