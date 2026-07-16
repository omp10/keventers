import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { Icon, type IconName } from '@/design-system';
import { transitions } from '@/animations';
import { cn } from '@/lib/cn';
import { useStorefrontCategories } from '../hooks';
import type { Branch } from '../types';

/** Top cuisines by frequency across already-loaded branches (pure aggregation). */
export function deriveTopCuisines(branches: Branch[], max = 10): string[] {
  const freq = new Map<string, number>();
  for (const b of branches) {
    for (const c of b.restaurant.cuisines ?? []) {
      const key = c.trim();
      if (key) freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([c]) => c);
}

/** What one tile needs to render, whatever its source. */
type Tile = { key: string; label: string; imageUrl?: string; icon: IconName; searchTerm: string };

/**
 * CategoryChips — the circular browse tiles on the home screen. Categories are
 * ADMIN-MANAGED (curated with artwork and order via /admin/categories); until
 * admins define any, it falls back to cuisines derived from the branches already
 * loaded, so the rail is useful on day one and never shows empty chrome.
 */
export function CategoryChips({ branches, className }: { branches: Branch[]; className?: string }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const managed = useStorefrontCategories();

  const tiles = useMemo<Tile[]>(() => {
    const curated = managed.data ?? [];
    if (curated.length > 0) {
      return curated.map((c) => ({
        key: c.id,
        label: c.name,
        imageUrl: c.imageUrl,
        icon: (c.icon as IconName) ?? 'utensils',
        searchTerm: c.searchTerm || c.name,
      }));
    }
    return deriveTopCuisines(branches, 10).map((c) => ({ key: c, label: c, icon: 'utensils', searchTerm: c }));
  }, [managed.data, branches]);

  if (tiles.length === 0) return null;

  return (
    <nav aria-label="Browse by category" className={cn('-mx-4 px-4', className)}>
      <div className="flex snap-x gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tiles.map((t, i) => (
          <motion.button
            key={t.key}
            type="button"
            onClick={() => navigate(`/search?q=${encodeURIComponent(t.searchTerm)}`)}
            initial={reduced ? undefined : { opacity: 0, y: 8 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ ...transitions.default, delay: Math.min(i * 0.04, 0.3) }}
            whileHover={reduced ? undefined : { y: -2 }}
            whileTap={reduced ? undefined : { scale: 0.94 }}
            className="group flex w-20 shrink-0 snap-start flex-col items-center gap-1.5 focus-visible:outline-none"
          >
            {/* Circular tile — admin artwork when set, brand icon otherwise. */}
            <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-border bg-surface shadow-sm transition-[box-shadow,border-color] group-hover:border-primary/40 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring motion-reduce:transition-none">
              {t.imageUrl ? (
                <img
                  src={t.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
                  <Icon name={t.icon} className="h-4.5 w-4.5" />
                </span>
              )}
            </span>
            <span className="max-w-full truncate text-[0.6875rem] font-semibold uppercase tracking-wide text-foreground-muted group-hover:text-primary">
              {t.label}
            </span>
          </motion.button>
        ))}
      </div>
    </nav>
  );
}
