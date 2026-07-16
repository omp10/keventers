import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { ProductCard } from '../components';
import type { BranchMenu, MenuCategory, Product } from '../types';

/**
 * MenuBoard — the sticky category navigation + scroll-spy menu sections. One place
 * owns the refs, the IntersectionObserver highlight, and click-to-scroll, so the
 * nav and the list stay in sync (no duplicated logic). Categories are rendered in
 * order; images lazy-load and the DOM stays flat (virtualization-ready).
 */
export function MenuBoard({
  menu,
  onAdd,
  onOpen,
  onPrefetch,
  cartQuantities,
}: {
  menu: BranchMenu;
  onAdd: (p: Product) => void;
  onOpen: (p: Product) => void;
  onPrefetch?: (slug: string) => void;
  cartQuantities?: Record<string, number>;
}) {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [active, setActive] = useState<string | null>(null);

  const categories = useMemo(
    () => [...menu.categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [menu.categories],
  );
  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of menu.products) {
      const arr = map.get(p.categoryId) ?? [];
      arr.push(p);
      map.set(p.categoryId, arr);
    }
    return map;
  }, [menu.products]);

  const visibleCategories = categories.filter((c) => (productsByCategory.get(c.id)?.length ?? 0) > 0);

  useEffect(() => {
    setActive((prev) => prev ?? visibleCategories[0]?.id ?? null);
  }, [visibleCategories]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.getAttribute('data-cat'));
      },
      { rootMargin: '-120px 0px -70% 0px', threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [visibleCategories.length]);

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      {/* Sticky category nav */}
      <nav
        aria-label="Menu categories"
        className="sticky top-0 z-30 -mx-4 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => scrollTo(c.id)}
            aria-current={active === c.id}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
              active === c.id ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:bg-muted hover:text-foreground',
            )}
          >
            {c.name}
          </button>
        ))}
      </nav>

      {/* Sections */}
      <div className="mt-2">
        {visibleCategories.map((c) => (
          <CategorySection
            key={c.id}
            category={c}
            products={productsByCategory.get(c.id) ?? []}
            registerRef={(el) => (sectionRefs.current[c.id] = el)}
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

function CategorySection({
  category,
  products,
  registerRef,
  onAdd,
  onOpen,
  onPrefetch,
  cartQuantities,
}: {
  category: MenuCategory;
  products: Product[];
  registerRef: (el: HTMLElement | null) => void;
  onAdd: (p: Product) => void;
  onOpen: (p: Product) => void;
  onPrefetch?: (slug: string) => void;
  cartQuantities?: Record<string, number>;
}) {
  return (
    <section ref={registerRef} data-cat={category.id} className="scroll-mt-28 pt-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-foreground">{category.name}</h2>
        <span className="text-xs text-foreground-subtle">{products.length}</span>
      </div>
      {category.description && <p className="mb-2 text-sm text-foreground-muted">{category.description}</p>}
      <div>
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            variant="list"
            onAdd={onAdd}
            onOpen={onOpen}
            onPrefetch={onPrefetch}
            inCartQty={cartQuantities?.[p.id]}
          />
        ))}
      </div>
    </section>
  );
}
