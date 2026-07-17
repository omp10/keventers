import { useState } from 'react';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Icon,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Textarea,
  toast,
} from '@/design-system';
import { EntityDrawer } from '@/features/management/components';
import { qk, queryClient, useQueryResource } from '@/platform/query';
import { cn } from '@/lib/cn';

import { adminService } from '../../admin.service';
import type {
  AdminKitchen,
  CatalogAvailabilityStatus,
  CatalogCategory,
  CatalogCategoryPayload,
  CatalogMenu,
  CatalogProduct,
  CatalogProductPayload,
  CatalogProductStatus,
  KitchenCatalog,
} from '../../types';

/**
 * MenuTab — the full menu tree this outlet serves: menus → categories →
 * subcategories → products, with prices, availability and dietary tags.
 *
 * The catalog belongs to the RESTAURANT, not to this branch — every outlet of
 * the brand serves it. The banner says so, because "edit this kitchen's menu" is
 * a reasonable thing to assume and a costly thing to assume wrongly.
 */
export function MenuTab({ kitchen: k }: { kitchen: AdminKitchen }) {
  const key = qk('admin', 'kitchen-catalog', k.restaurantId);
  const catalog = useQueryResource<KitchenCatalog>(key, () => adminService.kitchenCatalog(k.restaurantId));
  const [editCategory, setEditCategory] = useState<CatalogCategory | null>(null);
  const [editProduct, setEditProduct] = useState<CatalogProduct | null>(null);

  /**
   * The catalog tree is served from a Redis cache that the backend invalidates on
   * mutation, so refetch rather than patch the cache locally — the server's copy
   * is the one the storefront will serve.
   */
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  if (catalog.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const menus = catalog.data?.menus ?? [];
  if (!menus.length) {
    return (
      <EmptyState
        title="No menu yet"
        description={`${k.restaurant?.name ?? 'This brand'} hasn't published a menu. It's built in the restaurant dashboard.`}
        icon={<Icon name="utensils" className="mb-4 h-10 w-10 text-foreground-subtle" />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ScopeNote restaurantName={k.restaurant?.name} />
      {menus.map((m) => (
        <MenuCard key={m.id} menu={m} onEditCategory={setEditCategory} onEditProduct={setEditProduct} />
      ))}

      <CategoryDrawer
        category={editCategory}
        restaurantId={k.restaurantId}
        onClose={() => setEditCategory(null)}
        onSaved={refresh}
      />
      <ProductDrawer
        product={editProduct}
        restaurantId={k.restaurantId}
        onClose={() => setEditProduct(null)}
        onSaved={refresh}
      />
    </div>
  );
}

/** Edit a category. Applies to every outlet of the brand. */
function CategoryDrawer({
  category,
  restaurantId,
  onClose,
  onSaved,
}: {
  category: CatalogCategory | null;
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<CatalogCategoryPayload>({});
  const [saving, setSaving] = useState(false);
  const [dirtyFor, setDirtyFor] = useState<string | null>(null);

  // Re-seed the form when a different category is opened.
  if (category && dirtyFor !== category.id) {
    setDirtyFor(category.id);
    setDraft({
      name: category.name,
      description: category.description ?? '',
      status: (category.status as CatalogCategoryPayload['status']) ?? 'active',
      isFeatured: category.isFeatured,
    });
  }

  const save = async () => {
    if (!category) return;
    if (!draft.name?.trim()) return toast.error('A category name is required.');
    setSaving(true);
    try {
      await adminService.updateCatalogCategory(category.id, restaurantId, draft);
      toast.success('Category updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityDrawer
      open={Boolean(category)}
      onClose={onClose}
      title={category ? `Edit ${category.name}` : 'Edit category'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={() => void save()}>Save changes</Button>
        </div>
      }
    >
      {category && (
        <>
          <BrandWideNote />
          <Field label="Name" required>
            <Input value={draft.name ?? ''} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={draft.description ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </Field>
          <Field label="Status" description="Inactive hides the category from customers.">
            <Picker
              value={draft.status ?? 'active'}
              onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </Field>
          <Field label="Featured" orientation="horizontal" description="Highlight this category.">
            <Switch
              checked={Boolean(draft.isFeatured)}
              onCheckedChange={(on) => setDraft((d) => ({ ...d, isFeatured: on }))}
            />
          </Field>
        </>
      )}
    </EntityDrawer>
  );
}

/** Edit a product. Applies to every outlet of the brand. */
function ProductDrawer({
  product,
  restaurantId,
  onClose,
  onSaved,
}: {
  product: CatalogProduct | null;
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<CatalogProductPayload>({});
  const [saving, setSaving] = useState(false);
  const [dirtyFor, setDirtyFor] = useState<string | null>(null);

  if (product && dirtyFor !== product.id) {
    setDirtyFor(product.id);
    setDraft({
      name: product.name,
      shortDescription: product.shortDescription ?? '',
      description: product.description ?? '',
      pricing: { basePrice: product.pricing?.basePrice },
      preparationTimeMinutes: product.preparationTimeMinutes,
      status: (product.status as CatalogProductStatus) ?? 'active',
      isFeatured: product.isFeatured,
      isPopular: product.isPopular,
      isRecommended: product.isRecommended,
      availability: { status: (product.availability?.status as CatalogAvailabilityStatus) ?? 'available' },
    });
  }

  const save = async () => {
    if (!product) return;
    if (!draft.name?.trim()) return toast.error('A product name is required.');
    const price = draft.pricing?.basePrice;
    if (price == null || Number.isNaN(price) || price < 0) return toast.error('Enter a valid price.');
    setSaving(true);
    try {
      await adminService.updateCatalogProduct(product.id, restaurantId, draft);
      toast.success('Product updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityDrawer
      open={Boolean(product)}
      onClose={onClose}
      title={product ? `Edit ${product.name}` : 'Edit product'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={() => void save()}>Save changes</Button>
        </div>
      }
    >
      {product && (
        <>
          <BrandWideNote />
          <Field label="Name" required>
            <Input value={draft.name ?? ''} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
          <Field label="Short description" description="Shown on menu cards.">
            <Input
              value={draft.shortDescription ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, shortDescription: e.target.value }))}
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={draft.description ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (₹)" required description="In rupees, as the catalog stores it.">
              <Input
                type="number"
                min="0"
                step="1"
                value={String(draft.pricing?.basePrice ?? '')}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    pricing: { basePrice: e.target.value === '' ? undefined : Number(e.target.value) },
                  }))
                }
              />
            </Field>
            <Field label="Prep time (min)">
              <Input
                type="number"
                min="0"
                value={String(draft.preparationTimeMinutes ?? '')}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    preparationTimeMinutes: e.target.value === '' ? undefined : Number(e.target.value),
                  }))
                }
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Picker<CatalogProductStatus>
                value={draft.status ?? 'active'}
                onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'archived', label: 'Archived' },
                ]}
              />
            </Field>
            <Field label="Availability" description="Out of stock hides it from ordering.">
              <Picker<CatalogAvailabilityStatus>
                value={draft.availability?.status ?? 'available'}
                onChange={(v) => setDraft((d) => ({ ...d, availability: { status: v } }))}
                options={[
                  { value: 'available', label: 'Available' },
                  { value: 'out_of_stock', label: 'Out of stock' },
                  { value: 'temporarily_disabled', label: 'Temporarily disabled' },
                ]}
              />
            </Field>
          </div>
          <Field label="Featured" orientation="horizontal">
            <Switch checked={Boolean(draft.isFeatured)} onCheckedChange={(on) => setDraft((d) => ({ ...d, isFeatured: on }))} />
          </Field>
          <Field label="Popular" orientation="horizontal">
            <Switch checked={Boolean(draft.isPopular)} onCheckedChange={(on) => setDraft((d) => ({ ...d, isPopular: on }))} />
          </Field>
          <Field label="Recommended" orientation="horizontal">
            <Switch
              checked={Boolean(draft.isRecommended)}
              onCheckedChange={(on) => setDraft((d) => ({ ...d, isRecommended: on }))}
            />
          </Field>
        </>
      )}
    </EntityDrawer>
  );
}

/** Radix Select is compositional; this wraps the boilerplate for simple pickers. */
function Picker<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BrandWideNote() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5">
      <Icon name="warning" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-sm text-foreground">This change applies to every outlet of the brand, not just this kitchen.</p>
    </div>
  );
}

function ScopeNote({ restaurantName }: { restaurantName?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-info/30 bg-info-soft px-3.5 py-2.5">
      <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
      <p className="text-sm text-foreground">
        This menu belongs to <strong>{restaurantName ?? 'the restaurant'}</strong> and is shared by all of its outlets —
        a change here affects every kitchen of the brand, not just this one.
      </p>
    </div>
  );
}

/**
 * The API hands every product of a main category AND its subcategories back as
 * one flat list on the main category, while the subcategory DTOs carry no
 * products at all. Re-file each product under the category it actually belongs
 * to (`categoryId`) so subcategories don't all render as empty.
 */
type MenuNode = { category: CatalogCategory; products: CatalogProduct[]; children: MenuNode[] };

function buildTree(categories: CatalogCategory[]): MenuNode[] {
  return categories.map((main) => {
    const all = main.products ?? [];
    const children = (main.subcategories ?? []).map((sub) => ({
      category: sub,
      products: all.filter((p) => p.categoryId === sub.id),
      children: [],
    }));
    return { category: main, products: all.filter((p) => p.categoryId === main.id), children };
  });
}

function nodeTotal(n: MenuNode): number {
  return n.products.length + n.children.reduce((sum, c) => sum + nodeTotal(c), 0);
}

type EditHandlers = {
  onEditCategory: (c: CatalogCategory) => void;
  onEditProduct: (p: CatalogProduct) => void;
};

function MenuCard({ menu, onEditCategory, onEditProduct }: { menu: CatalogMenu } & EditHandlers) {
  const categories = menu.categories ?? [];
  const tree = buildTree(categories);
  const productCount = tree.reduce((sum, n) => sum + nodeTotal(n), 0);

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{menu.name}</h2>
            {menu.isDefault && <Badge tone="accent" variant="soft">Default</Badge>}
            <Badge tone={menu.isActive ? 'success' : 'neutral'} variant="soft">{menu.status}</Badge>
          </div>
          {menu.description && <p className="mt-0.5 text-sm text-foreground-muted">{menu.description}</p>}
        </div>
        <p className="text-xs text-foreground-subtle">
          {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} · {productCount} product{productCount === 1 ? '' : 's'}
        </p>
      </div>

      {tree.length === 0 ? (
        <p className="text-sm text-foreground-muted">This menu has no categories yet.</p>
      ) : (
        <ul className="space-y-2">
          {tree.map((n) => (
            <CategoryNode key={n.category.id} node={n} onEditCategory={onEditCategory} onEditProduct={onEditProduct} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function CategoryNode({ node, depth = 0, onEditCategory, onEditProduct }: { node: MenuNode; depth?: number } & EditHandlers) {
  const [open, setOpen] = useState(depth === 0);
  const { category, products, children } = node;
  const total = nodeTotal(node);

  return (
    <li className={cn('rounded-lg border border-border', depth > 0 && 'bg-surface-raised')}>
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name={open ? 'chevronDown' : 'chevronRight'} className="h-4 w-4 shrink-0 text-foreground-subtle" />
          {category.imageUrl ? (
            <img src={category.imageUrl} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
          ) : null}
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm text-foreground">{category.name}</strong>
            {category.description && <span className="block truncate text-xs text-foreground-muted">{category.description}</span>}
          </span>
          {category.isFeatured && <Badge tone="accent" variant="soft">Featured</Badge>}
          {category.status !== 'active' && <Badge tone="neutral" variant="soft">{category.status}</Badge>}
          <span className="shrink-0 text-xs tabular-nums text-foreground-subtle">{total}</span>
        </button>
        <Button
          size="sm"
          variant="ghost"
          leftIcon="edit"
          aria-label={`Edit ${category.name}`}
          onClick={() => onEditCategory(category)}
        />
      </div>

      {open && (
        <div className="space-y-2 border-t border-border px-3 py-2.5">
          {children.length > 0 && (
            <ul className="space-y-2">
              {children.map((c) => (
                <CategoryNode
                  key={c.category.id}
                  node={c}
                  depth={depth + 1}
                  onEditCategory={onEditCategory}
                  onEditProduct={onEditProduct}
                />
              ))}
            </ul>
          )}
          {products.length > 0 && (
            <ul className="divide-y divide-border">
              {products.map((p) => (
                <ProductRow key={p.id} product={p} onEdit={() => onEditProduct(p)} />
              ))}
            </ul>
          )}
          {children.length === 0 && products.length === 0 && (
            <p className="py-1 text-xs text-foreground-subtle">Nothing in this category yet.</p>
          )}
        </div>
      )}
    </li>
  );
}

function ProductRow({ product: p, onEdit }: { product: CatalogProduct; onEdit: () => void }) {
  const unavailable = p.availability?.status && p.availability.status !== 'available';
  return (
    <li className="flex items-center gap-3 py-2">
      {p.thumbnailUrl ? (
        <img src={p.thumbnailUrl} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-muted">
          <Icon name="utensils" className="h-3.5 w-3.5 text-foreground-subtle" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <strong className="truncate text-sm font-medium text-foreground">{p.name}</strong>
          {p.isFeatured && <Badge tone="accent" variant="soft">Featured</Badge>}
          {p.isPopular && <Badge tone="info" variant="soft">Popular</Badge>}
          {p.hasVariants && <Badge tone="neutral" variant="soft">Variants</Badge>}
        </div>
        <p className="truncate text-xs text-foreground-muted">
          {p.shortDescription || p.description || p.dietaryTags.join(', ') || '—'}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <strong className="block text-sm tabular-nums text-foreground">{formatCatalogPrice(p.pricing?.basePrice)}</strong>
        {unavailable ? (
          <span className="text-xs text-warning">{p.availability.status.replace(/_/g, ' ')}</span>
        ) : p.status !== 'active' ? (
          <span className="text-xs text-foreground-subtle">{p.status}</span>
        ) : null}
      </div>
      <Button size="sm" variant="ghost" leftIcon="edit" aria-label={`Edit ${p.name}`} onClick={onEdit} />
    </li>
  );
}

/**
 * Catalog prices are plain MAJOR-unit numbers in the restaurant's currency (see
 * `moneyField` in the catalog schema util) — unlike the Money DTO the ordering
 * surfaces receive, which carries minor units. Don't divide by 100 here: the
 * cart converts these with `Money.fromMajor` at checkout.
 */
function formatCatalogPrice(major?: number): string {
  if (major == null) return '—';
  return `₹${major.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(major) ? 0 : 2, maximumFractionDigits: 2 })}`;
}
