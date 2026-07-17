import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { Icon } from '@/design-system';
import { transitions } from '@/animations';
import { cn } from '@/lib/cn';
import { ProductCard } from '../components';
import { buildMenuTree, findNode, findSub, type MenuNode } from './menu-tree';
import type { BranchMenu, MenuCategory, Product } from '../types';

/** All-subcategories sentinel — a real slug can never be empty. */
const ALL = '';

export type MenuSelection = { categorySlug?: string; subSlug?: string };

type ProductHandlers = {
  onAdd: (p: Product) => void;
  onOpen: (p: Product) => void;
  onPrefetch?: (slug: string) => void;
  cartQuantities?: Record<string, number>;
};

/**
 * MenuBoard — the sticky category navigation + scroll-spy menu sections, which
 * ADAPTS to each category's shape: a category whose products hang directly off
 * it opens straight into products; one with subcategories offers a chip row
 * first. Both come from the same self-referencing Category model (depth ≤ 1) —
 * see `buildMenuTree`.
 *
 * One place owns the refs, the IntersectionObserver highlight and click-to-
 * scroll, so the nav and the list stay in sync. `selection` / `onSelect` keep
 * the URL (deep links) and the UI as one state.
 */
export function MenuBoard({
  menu,
  selection,
  onSelect,
  onAdd,
  onOpen,
  onPrefetch,
  cartQuantities,
}: {
  menu: BranchMenu;
  selection?: MenuSelection;
  onSelect?: (next: MenuSelection) => void;
  onAdd: (p: Product) => void;
  onOpen: (p: Product) => void;
  onPrefetch?: (slug: string) => void;
  cartQuantities?: Record<string, number>;
}) {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [active, setActive] = useState<string | null>(null);
  const reduced = Boolean(useReducedMotion());

  const tree = useMemo(() => buildMenuTree(menu), [menu]);

  /** Per-main selected subcategory slug (ALL = show every group). */
  const [subBySlug, setSubBySlug] = useState<Record<string, string>>({});

  // Adopt an incoming deep link (e.g. /menu/milkshakes/premium) exactly once per
  // change: scroll to the category and preselect the subcategory.
  const deepLinked = useRef<string>('');
  useEffect(() => {
    const key = `${selection?.categorySlug ?? ''}/${selection?.subSlug ?? ''}`;
    if (key === deepLinked.current) return;
    deepLinked.current = key;

    const node = findNode(tree, selection?.categorySlug);
    if (!node) return;
    if (selection?.subSlug && findSub(node, selection.subSlug)) {
      setSubBySlug((s) => ({ ...s, [node.category.slug]: selection.subSlug! }));
    }
    setActive(node.category.id);
    // Wait a frame so the (possibly newly filtered) section is laid out.
    requestAnimationFrame(() =>
      sectionRefs.current[node.category.id]?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'start',
      }),
    );
  }, [selection?.categorySlug, selection?.subSlug, tree, reduced]);

  useEffect(() => {
    setActive((prev) => prev ?? tree[0]?.category.id ?? null);
  }, [tree]);

  // Scroll-spy: the topmost visible section wins.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.getAttribute('data-cat'));
      },
      { rootMargin: '-120px 0px -70% 0px', threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [tree.length]);

  const goToCategory = useCallback(
    (node: MenuNode) => {
      setActive(node.category.id);
      onSelect?.({ categorySlug: node.category.slug, subSlug: subBySlug[node.category.slug] || undefined });
      sectionRefs.current[node.category.id]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    },
    [onSelect, subBySlug, reduced],
  );

  const selectSub = useCallback(
    (node: MenuNode, subSlug: string) => {
      setSubBySlug((s) => ({ ...s, [node.category.slug]: subSlug }));
      onSelect?.({ categorySlug: node.category.slug, subSlug: subSlug || undefined });
    },
    [onSelect],
  );

  const activeNode = tree.find((n) => n.category.id === active);

  if (tree.length === 0) return null;

  return (
    <div>
      {/* Level 1 — main categories */}
      <nav
        aria-label="Menu categories"
        className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur"
      >
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tree.map((node) => (
            <button
              key={node.category.id}
              type="button"
              onClick={() => goToCategory(node)}
              aria-current={active === node.category.id ? 'true' : undefined}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none',
                active === node.category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground-muted hover:bg-muted hover:text-foreground',
              )}
            >
              {node.category.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Breadcrumb — only meaningful once a category is in view */}
      {activeNode && (
        <Breadcrumbs
          node={activeNode}
          subSlug={subBySlug[activeNode.category.slug] ?? ALL}
          onRoot={() => {
            onSelect?.({});
            window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
          }}
          onCategory={() => selectSub(activeNode, ALL)}
          reduced={reduced}
        />
      )}

      <div>
        {tree.map((node) => (
          <CategorySection
            key={node.category.id}
            node={node}
            selectedSub={subBySlug[node.category.slug] ?? ALL}
            onSelectSub={(slug) => selectSub(node, slug)}
            registerRef={(el) => (sectionRefs.current[node.category.id] = el)}
            reduced={reduced}
            onAdd={onAdd}
            onOpen={onOpen}
            onPrefetch={onPrefetch}
            cartQuantities={cartQuantities}
          />
        ))}
      </div>
    </div>
  );
}

/** Menu › Milkshakes › Premium — clickable, and silent when there's nothing to say. */
function Breadcrumbs({
  node,
  subSlug,
  onRoot,
  onCategory,
  reduced,
}: {
  node: MenuNode;
  subSlug: string;
  onRoot: () => void;
  onCategory: () => void;
  reduced: boolean;
}) {
  const sub = node.subs.find((s) => s.category.slug === subSlug);
  const crumb = 'rounded text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 pt-3 text-foreground-subtle">
      <button type="button" onClick={onRoot} className={cn(crumb, 'hover:text-foreground')}>Menu</button>
      <Icon name="chevronRight" className="h-3 w-3 shrink-0" aria-hidden />
      <button
        type="button"
        onClick={onCategory}
        className={cn(crumb, sub ? 'hover:text-foreground' : 'text-foreground')}
        aria-current={sub ? undefined : 'page'}
      >
        {node.category.name}
      </button>
      {/* No exit animation: a crumb that lingers after its section is gone is a
          lie, and removing it is not a moment worth animating. */}
      {sub && (
        <motion.span
          key={sub.category.id}
          initial={reduced ? false : { opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={transitions.fast}
          className="flex items-center gap-1.5"
        >
          <Icon name="chevronRight" className="h-3 w-3 shrink-0" aria-hidden />
          <span className="text-xs font-medium text-foreground" aria-current="page">{sub.category.name}</span>
        </motion.span>
      )}
    </nav>
  );
}

/** Level 2 — subcategory chips with an animated selection indicator. */
function SubNav({
  node,
  selected,
  onSelect,
  reduced,
}: {
  node: MenuNode;
  selected: string;
  onSelect: (slug: string) => void;
  reduced: boolean;
}) {
  const chips = [
    { slug: ALL, name: 'All', count: node.allProducts.length },
    ...node.subs.map((s) => ({ slug: s.category.slug, name: s.category.name, count: s.products.length })),
  ];
  return (
    <div
      role="tablist"
      aria-label={`${node.category.name} subcategories`}
      className="-mx-4 mt-2 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => {
        const active = selected === chip.slug;
        return (
          <button
            key={chip.slug || 'all'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(chip.slug)}
            className={cn(
              'relative shrink-0 snap-start rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none',
              active
                ? 'border-primary text-primary-foreground'
                : 'border-border text-foreground-muted hover:border-primary/40 hover:text-foreground',
            )}
          >
            {/* Shared-layout pill — the indicator slides between chips. */}
            {active && (
              <motion.span
                layoutId={`subnav-${node.category.id}`}
                className="absolute inset-0 rounded-full bg-primary"
                transition={reduced ? { duration: 0 } : transitions.snappy}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {chip.name}
              <span className={cn('text-[0.6875rem]', active ? 'opacity-70' : 'text-foreground-subtle')}>{chip.count}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ProductList({ products, ...handlers }: { products: Product[] } & ProductHandlers) {
  return (
    <div>
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          variant="list"
          onAdd={handlers.onAdd}
          onOpen={handlers.onOpen}
          onPrefetch={handlers.onPrefetch}
          inCartQty={handlers.cartQuantities?.[p.id]}
        />
      ))}
    </div>
  );
}

function CategorySection({
  node,
  selectedSub,
  onSelectSub,
  registerRef,
  reduced,
  ...handlers
}: {
  node: MenuNode;
  selectedSub: string;
  onSelectSub: (slug: string) => void;
  registerRef: (el: HTMLElement | null) => void;
  reduced: boolean;
} & ProductHandlers) {
  const { category, subs, directProducts, showSubNav } = node;
  const activeSub = subs.find((s) => s.category.slug === selectedSub);
  const showingAll = !activeSub;

  return (
    <section ref={registerRef} data-cat={category.id} className="scroll-mt-28 pt-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-foreground">{category.name}</h2>
        <span className="text-xs text-foreground-subtle">{node.allProducts.length}</span>
      </div>
      {category.description && <p className="mb-2 text-sm text-foreground-muted">{category.description}</p>}

      {showSubNav && <SubNav node={node} selected={selectedSub} onSelect={onSelectSub} reduced={reduced} />}

      {/*
        Keyed remount fades the new list in. Deliberately NOT AnimatePresence
        with mode="wait": that gates the CONTENT SWAP on an exit animation
        finishing, so anywhere rAF is throttled (a backgrounded tab, low-power
        mode) a filter tap would leave the reader staring at the previous list.
        The filter must apply instantly; the fade is decoration.
      */}
      <motion.div
        key={selectedSub || 'all'}
        initial={reduced ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitions.fast}
        className="mt-2"
      >
        {activeSub ? (
          <ProductList products={activeSub.products} {...handlers} />
        ) : (
          <>
            {/* Products hung straight on the main category come first… */}
            {directProducts.length > 0 && <ProductList products={directProducts} {...handlers} />}
            {/* …then each subcategory as its own labelled group. With ≤1 sub
                there's no chip row, so the extra heading would be noise. */}
            {subs.map((s) => (
              <div key={s.category.id}>
                {showSubNav && showingAll && <SubHeading category={s.category} count={s.products.length} />}
                <ProductList products={s.products} {...handlers} />
              </div>
            ))}
          </>
        )}
      </motion.div>
    </section>
  );
}

function SubHeading({ category, count }: { category: MenuCategory; count: number }) {
  return (
    <div className="mb-1 mt-4 flex items-baseline gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">{category.name}</h3>
      <span className="text-xs text-foreground-subtle">{count}</span>
    </div>
  );
}
