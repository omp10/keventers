import { useEffect, useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  EmptyState,
  Icon,
  Input,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@/design-system';
import { cn } from '@/lib/cn';
import { formatMoney, ProductCard, type Product } from '@/features/ordering';

import { useProduct, useCategories, useModifierGroups, useAddons, useProductMutations } from '../hooks';
import { resolveCategorySelection } from './category-selection';
import {
  StatusBadge,
  PriceInput,
  VegSelect,
  ScheduleField,
  AvailabilityControl,
  SortableList,
} from '../components';
import { MediaManager } from '../media';
import type { CatalogProduct, Money, VariantDraft } from '../types';

type ProductEditorProps = {
  productId?: string;
  isNew?: boolean;
  onClose: () => void;
};

const ZERO: Money = { amount: 0, currency: 'INR', major: 0 };

function blankDraft(): CatalogProduct {
  return {
    id: '',
    name: '',
    price: { ...ZERO },
    images: [],
    availability: { status: 'available' },
    status: 'draft',
    variants: [],
    modifierGroups: [],
    addons: [],
    tags: [],
  };
}

const TABS = [
  'General',
  'Media',
  'Pricing',
  'Variants',
  'Modifiers',
  'Add-ons',
  'Availability',
  'SEO',
  'Scheduling',
  'Preview',
  'Audit',
] as const;

/** A labelled section wrapper for consistent form rhythm. */
function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-foreground-subtle">{hint}</span>}
    </label>
  );
}

/**
 * ProductEditor — the full product authoring surface, shown as a right-side Drawer.
 * Holds a local editable `draft` seeded from the loaded product (or a blank draft in
 * new mode). All business rules (pricing math, publish state machine) stay backend-owned.
 */
export function ProductEditor({ productId, isNew, onClose }: ProductEditorProps) {
  const { data: loaded, isLoading } = useProduct(isNew ? undefined : productId);
  const { data: categories } = useCategories();
  const { data: modifierGroups } = useModifierGroups();
  const { data: addons } = useAddons();
  const m = useProductMutations();

  const [tab, setTab] = useState<string>('General');
  const [draft, setDraft] = useState<CatalogProduct>(() => blankDraft());

  // Seed the editable draft when the loaded product (or target id) changes.
  useEffect(() => {
    if (isNew) {
      setDraft(blankDraft());
    } else if (loaded) {
      setDraft({ ...blankDraft(), ...loaded });
    }
  }, [isNew, loaded, productId]);

  const patch = (p: Partial<CatalogProduct>) => setDraft((d) => ({ ...d, ...p }));

  // ---- Category → Subcategory (see `resolveCategorySelection`) ------------
  const { mains, current, mainId, subs, subMissing } = useMemo(
    () => resolveCategorySelection(categories ?? [], draft.categoryId),
    [categories, draft.categoryId],
  );

  const selectMain = (id: string | undefined) => {
    const main = (categories ?? []).find((c) => c.id === id);
    patch({ categoryId: main?.id, categoryName: main?.name });
  };
  const selectSub = (id: string) => {
    // Clearing the sub falls back to the main, which re-raises the requirement.
    const next = (categories ?? []).find((c) => c.id === id) ?? (categories ?? []).find((c) => c.id === mainId);
    patch({ categoryId: next?.id, categoryName: next?.name });
  };

  // ---- Variants ----
  const variants = draft.variants ?? [];
  const addVariant = () =>
    patch({
      variants: [...variants, { id: crypto.randomUUID(), name: '', price: { ...ZERO }, available: true }],
    });
  const patchVariant = (id: string, p: Partial<VariantDraft>) =>
    patch({ variants: variants.map((v) => (v.id === id ? { ...v, ...p } : v)) });
  const removeVariant = (id: string) => patch({ variants: variants.filter((v) => v.id !== id) });
  const reorderVariants = (orderedIds: string[]) =>
    patch({
      variants: orderedIds
        .map((id, i) => {
          const v = variants.find((x) => x.id === id);
          return v ? { ...v, order: i } : null;
        })
        .filter((v): v is NonNullable<typeof v> => v != null),
    });

  // ---- Modifiers (attach/detach) ----
  const attachedGroupIds = new Set((draft.modifierGroups ?? []).map((g) => g.id));
  const toggleGroup = (id: string) => {
    const group = (modifierGroups ?? []).find((g) => g.id === id);
    if (!group) return;
    if (attachedGroupIds.has(id)) {
      patch({ modifierGroups: (draft.modifierGroups ?? []).filter((g) => g.id !== id) });
    } else {
      patch({ modifierGroups: [...(draft.modifierGroups ?? []), group] });
    }
  };

  // ---- Add-ons (attach/detach) ----
  const attachedAddonIds = new Set((draft.addons ?? []).map((a) => a.id));
  const toggleAddon = (id: string) => {
    const addon = (addons ?? []).find((a) => a.id === id);
    if (!addon) return;
    if (attachedAddonIds.has(id)) {
      patch({ addons: (draft.addons ?? []).filter((a) => a.id !== id) });
    } else {
      patch({ addons: [...(draft.addons ?? []), addon] });
    }
  };

  // ---- Save / publish ----
  const save = async (): Promise<CatalogProduct | null> => {
    // A product MUST be filed under a category — the API requires `categoryId`
    // and 422s without it. Catch it here so the answer is a sentence rather
    // than a raw validation error, and so a brand-new restaurant with no
    // categories yet is told what to do instead of what went wrong.
    if (!draft.categoryId) {
      toast.error(
        mains.length === 0 ? 'Create a category first' : 'Choose a category',
        {
          description:
            mains.length === 0
              ? 'Every item lives under a category. Add one in Categories, then come back.'
              : 'Every item lives under a category — pick the one this belongs in.',
        },
      );
      setTab('General');
      return null;
    }
    try {
      // Keep the cover in sync with the gallery: the customer menu prefers
      // heroImageUrl/thumbnailUrl over images[0], so leaving them stale after a
      // gallery edit showed the OLD photo (or none) to customers.
      const cover = draft.images[0]?.url ?? null;
      const body = { ...draft, heroImageUrl: cover, thumbnailUrl: cover };
      const saved = isNew ? await m.create(body) : await m.update(productId!, body);
      return saved ?? null;
    } catch {
      return null;
    }
  };

  const handleSaveDraft = async () => {
    const saved = await save();
    if (saved) onClose();
  };

  const handlePublish = async () => {
    // Draft saves stay open — a draft is unfinished by definition. Publishing is
    // the gate, because a product filed on a subdivided main is one customers
    // would never reach.
    if (subMissing) {
      setTab('General');
      toast.error('Choose a subcategory', { description: `${current?.name} is split into subcategories.` });
      return;
    }
    const saved = await save();
    if (!saved) return;
    try {
      await m.publish(saved.id);
      onClose();
    } catch {
      toast.error('Could not publish');
    }
  };

  // ---- Preview mapping (draft → ordering Product) ----
  const previewProduct: Product = {
    id: draft.id || 'preview',
    slug: draft.slug ?? 'preview',
    name: draft.name || 'Product name',
    description: draft.description,
    imageUrl: draft.images[0]?.url,
    categoryId: draft.categoryId ?? '',
    price: draft.price,
    discountedPrice: draft.discountedPrice,
    veg: draft.veg,
    popular: draft.popular,
    available: draft.availability?.status === 'available',
    customizable: (draft.variants?.length || draft.modifierGroups?.length) ? true : false,
  };

  const tagsValue = (draft.tags ?? []).join(', ');

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} direction="right">
      <DrawerContent side="right" className="flex w-full flex-col p-0 sm:max-w-2xl">
        <DrawerHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="truncate text-base font-semibold text-foreground">
                {isNew ? 'New product' : draft.name || 'Edit product'}
              </DrawerTitle>
            </div>
            <StatusBadge status={draft.status} />
            <Button variant="ghost" size="icon-sm" aria-label="Close editor" onClick={onClose}>
              <Icon name="close" />
            </Button>
          </div>
        </DrawerHeader>

        {!isNew && isLoading ? (
          <div className="grid flex-1 place-items-center">
            <Spinner />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <div className="overflow-x-auto border-b border-border px-3">
              <TabsList className="w-max">
                {TABS.map((t) => (
                  <TabsTrigger key={t} value={t}>
                    {t}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {/* GENERAL */}
              <TabsContent value="General" className="space-y-4">
                <Section label="Name">
                  <Input
                    value={draft.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    placeholder="e.g. Belgian Waffle"
                  />
                </Section>
                <Section label="Description">
                  <Textarea
                    value={draft.description ?? ''}
                    onChange={(e) => patch({ description: e.target.value })}
                    rows={3}
                    placeholder="Short, appetising description"
                  />
                </Section>
                <Section label="Category">
                  {/*
                    No "Uncategorised" option: `categoryId` is REQUIRED by the
                    API, so offering it promised something the save could never
                    honour — you'd pick it and get a raw 422 back. It's a
                    placeholder now, and with no categories at all the field
                    says so rather than presenting an empty dropdown.
                  */}
                  {mains.length === 0 ? (
                    <div className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2.5">
                      <p className="text-sm text-foreground">
                        No categories yet — every item has to live under one.
                      </p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        Create one in Catalog → Categories, then come back and it'll appear here.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={mainId ?? ''}
                      onChange={(e) => selectMain(e.target.value || undefined)}
                      aria-invalid={!draft.categoryId || undefined}
                      className={cn(
                        'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-foreground outline-none focus:border-border-strong',
                        draft.categoryId ? 'border-border' : 'border-danger',
                      )}
                    >
                      <option value="">Choose a category…</option>
                      {mains.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Section>
                {/* Only asked for when the chosen category actually has subcategories. */}
                {subs.length > 0 && (
                  <Section label="Subcategory">
                    <select
                      value={current?.parentId ? current.id : ''}
                      onChange={(e) => selectSub(e.target.value)}
                      aria-invalid={subMissing || undefined}
                      className={cn(
                        'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-foreground outline-none focus:border-border-strong',
                        subMissing ? 'border-danger' : 'border-border',
                      )}
                    >
                      <option value="">Choose a subcategory…</option>
                      {subs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {subMissing && (
                      <p className="mt-1.5 text-xs text-danger">
                        {current?.name} is split into subcategories, so pick the one this belongs in.
                      </p>
                    )}
                  </Section>
                )}
                <Section label="Food type">
                  <VegSelect value={draft.veg} onChange={(veg) => patch({ veg })} />
                </Section>
                <div className="grid grid-cols-2 gap-4">
                  <Section label="Prep time (min)">
                    <Input
                      type="number"
                      min={0}
                      value={draft.prepTimeMinutes ?? ''}
                      onChange={(e) =>
                        patch({ prepTimeMinutes: e.target.value === '' ? undefined : Number(e.target.value) })
                      }
                    />
                  </Section>
                  <Section label="Calories" hint="Placeholder — future nutrition module.">
                    <Input
                      type="number"
                      min={0}
                      value={draft.calories ?? ''}
                      onChange={(e) => patch({ calories: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                  </Section>
                </div>
                <Section label="Tags" hint="Comma-separated.">
                  <Input
                    value={tagsValue}
                    onChange={(e) =>
                      patch({
                        tags: e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="bestseller, chocolate, new"
                  />
                </Section>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <span className="text-sm font-medium text-foreground">Featured</span>
                  <Switch checked={!!draft.featured} onCheckedChange={(v) => patch({ featured: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <span className="text-sm font-medium text-foreground">Popular</span>
                  <Switch checked={!!draft.popular} onCheckedChange={(v) => patch({ popular: v })} />
                </div>
              </TabsContent>

              {/* MEDIA */}
              <TabsContent value="Media">
                <MediaManager images={draft.images} onChange={(images) => patch({ images })} />
              </TabsContent>

              {/* PRICING */}
              <TabsContent value="Pricing" className="space-y-4">
                <Section label="Price">
                  <PriceInput value={draft.price} onChange={(price) => patch({ price })} />
                </Section>
                <Section label="Sale price" hint="Optional promotional price.">
                  <PriceInput
                    value={draft.discountedPrice ?? null}
                    onChange={(discountedPrice) => patch({ discountedPrice })}
                  />
                </Section>
              </TabsContent>

              {/* VARIANTS */}
              <TabsContent value="Variants" className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground-muted">Sizes, portions, or other variations.</p>
                  <Button variant="secondary" size="sm" leftIcon="add" onClick={addVariant}>
                    Add variant
                  </Button>
                </div>
                {variants.length === 0 ? (
                  <Card padding="md" variant="outline" className="text-center text-sm text-foreground-subtle">
                    No variants yet.
                  </Card>
                ) : (
                  <SortableList
                    items={variants}
                    getId={(v) => v.id}
                    onReorder={reorderVariants}
                    renderItem={(v, { moveUp, moveDown, canMoveUp, canMoveDown, isDragging }) => (
                      <div
                        className={cn(
                          'flex items-center gap-2 rounded-lg border border-border bg-surface p-2',
                          isDragging && 'opacity-60',
                        )}
                      >
                        <span className="flex flex-col">
                          <button
                            type="button"
                            onClick={moveUp}
                            disabled={!canMoveUp}
                            aria-label="Move up"
                            className="text-foreground-subtle hover:text-foreground disabled:opacity-30"
                          >
                            <Icon name="chevronUp" />
                          </button>
                          <button
                            type="button"
                            onClick={moveDown}
                            disabled={!canMoveDown}
                            aria-label="Move down"
                            className="text-foreground-subtle hover:text-foreground disabled:opacity-30"
                          >
                            <Icon name="chevronDown" />
                          </button>
                        </span>
                        <Icon name="chevronsUpDown" className="shrink-0 cursor-grab text-foreground-subtle" aria-hidden />
                        <Input
                          value={v.name}
                          onChange={(e) => patchVariant(v.id, { name: e.target.value })}
                          placeholder="Variant name"
                          className="flex-1"
                        />
                        <div className="w-28 shrink-0">
                          <PriceInput value={v.price} onChange={(price) => patchVariant(v.id, { price })} />
                        </div>
                        <Switch
                          checked={v.available}
                          onCheckedChange={(available) => patchVariant(v.id, { available })}
                          aria-label="Available"
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove variant"
                          onClick={() => removeVariant(v.id)}
                        >
                          <Icon name="delete" />
                        </Button>
                      </div>
                    )}
                  />
                )}
              </TabsContent>

              {/* MODIFIERS */}
              <TabsContent value="Modifiers" className="space-y-2">
                <p className="text-sm text-foreground-muted">Attach shared modifier groups to this product.</p>
                {(modifierGroups ?? []).length === 0 ? (
                  <Card padding="md" variant="outline" className="text-center text-sm text-foreground-subtle">
                    No modifier groups defined.
                  </Card>
                ) : (
                  (modifierGroups ?? []).map((g) => (
                    <label
                      key={g.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <Checkbox checked={attachedGroupIds.has(g.id)} onCheckedChange={() => toggleGroup(g.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{g.name}</p>
                        <p className="text-xs text-foreground-subtle">
                          {g.required ? 'Required' : 'Optional'} · min {g.min} / max {g.max} · {g.modifiers.length}{' '}
                          option{g.modifiers.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </TabsContent>

              {/* ADD-ONS */}
              <TabsContent value="Add-ons" className="space-y-2">
                <p className="text-sm text-foreground-muted">Optional extras customers can add.</p>
                {(addons ?? []).length === 0 ? (
                  <Card padding="md" variant="outline" className="text-center text-sm text-foreground-subtle">
                    No add-ons defined.
                  </Card>
                ) : (
                  (addons ?? []).map((a) => (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <Checkbox checked={attachedAddonIds.has(a.id)} onCheckedChange={() => toggleAddon(a.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                      </div>
                      <span className="text-sm font-medium text-foreground-muted">{formatMoney(a.price)}</span>
                    </label>
                  ))
                )}
              </TabsContent>

              {/* AVAILABILITY */}
              <TabsContent value="Availability">
                <AvailabilityControl
                  value={draft.availability}
                  onChange={(availability) => patch({ availability })}
                />
              </TabsContent>

              {/* SEO */}
              <TabsContent value="SEO" className="space-y-4">
                <Section label="SEO title — optional">
                  <Input
                    value={draft.seo?.title ?? ''}
                    onChange={(e) => patch({ seo: { ...draft.seo, title: e.target.value } })}
                    placeholder="Overrides the product name in search results"
                  />
                </Section>
                <Section label="SEO description — optional">
                  <Textarea
                    value={draft.seo?.description ?? ''}
                    onChange={(e) => patch({ seo: { ...draft.seo, description: e.target.value } })}
                    rows={3}
                  />
                </Section>
              </TabsContent>

              {/* SCHEDULING */}
              <TabsContent value="Scheduling" className="space-y-3">
                <p className="text-sm text-foreground-muted">
                  Controls scheduled publishing — the product goes live within this window.
                </p>
                <ScheduleField
                  value={draft.availability.schedule}
                  onChange={(schedule) =>
                    // `scheduled` is a FLAG on the API, not an availability
                    // status — the status stays whatever it is (available /
                    // out of stock) and the schedule decides when it applies.
                    patch({ availability: { ...draft.availability, scheduled: true, schedule } })
                  }
                />
              </TabsContent>

              {/* PREVIEW */}
              <TabsContent value="Preview">
                <p className="mb-3 text-sm text-foreground-muted">How this looks to customers.</p>
                <div className="mx-auto max-w-xs rounded-3xl border border-border-strong bg-background p-2 shadow-sm">
                  <ProductCard product={previewProduct} variant="grid" onAdd={() => {}} onOpen={() => {}} />
                </div>
              </TabsContent>

              {/* AUDIT */}
              <TabsContent value="Audit">
                <Card padding="lg" variant="outline">
                  <EmptyState
                    icon={<Icon name="clock" />}
                    title="Audit history coming soon"
                    description="Change history and who edited what will appear here."
                    size="sm"
                  />
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        )}

        <DrawerFooter className="border-t border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2">
              <span className="text-xs text-foreground-subtle">Status</span>
              <Badge tone="neutral" variant="soft">
                {draft.status}
              </Badge>
            </div>
            <Button variant="ghost" onClick={onClose} disabled={m.saving}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft} loading={m.saving}>
              Save draft
            </Button>
            <Button variant="primary" leftIcon="checkCircle" onClick={handlePublish} loading={m.saving}>
              Publish
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
