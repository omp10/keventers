import { useState } from 'react';

import { Badge, Button, Card, Field, Icon, Input, Switch, toast } from '@/design-system';
import { EntityDrawer, ImageUploadField, ManagementPage, ManagementTable, StatusPill, type Column } from '@/features/management/components';
import { qk, queryClient, usePaginatedResource } from '@/platform/query';
import { adminService } from '../admin.service';
import type { AdminCategory, CategoryPayload } from '../types';

const KEY = qk('admin', 'categories');
const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

const emptyCategory = (): Partial<AdminCategory> => ({
  name: '',
  icon: 'utensils',
  searchTerm: '',
  featured: true,
  sortOrder: 0,
  status: 'active',
});

/**
 * CategoriesPage — ADMIN curation of the storefront browse tiles on the customer
 * home. Each category carries artwork, a display order and the term it searches;
 * the customer app reads the live set from /public/categories.
 *
 * These are storefront navigation, NOT a restaurant's menu sections (those live
 * in the restaurant dashboard's Catalog).
 */
export function CategoriesPage() {
  const q = usePaginatedResource<AdminCategory>(KEY, (p, l) => adminService.categories({}, p, l));
  const [draft, setDraft] = useState<Partial<AdminCategory> | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<AdminCategory>) => setDraft((d) => ({ ...d, ...p }));

  const save = async () => {
    if (!draft?.name?.trim()) return toast.error('A name is required.');
    setSaving(true);
    try {
      // null clears a previously-stored tile image.
      const body: CategoryPayload = { ...draft, imageUrl: draft.imageUrl || null, searchTerm: draft.searchTerm || draft.name };
      if (draft.id) await adminService.updateCategory(draft.id, body);
      else await adminService.createCategory(body);
      toast.success(draft.id ? 'Category updated' : 'Category created');
      setDraft(null);
      void invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the category');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: AdminCategory) => {
    await adminService.deleteCategory(c.id);
    toast.success('Category deleted');
    void invalidate();
  };

  /** Nudge a category up/down and persist the whole order in one call. */
  const move = async (index: number, delta: number) => {
    const next = [...q.items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await adminService.reorderCategories(next.map((c) => c.id));
    void invalidate();
  };

  const columns: Column<AdminCategory>[] = [
    {
      key: 'category',
      header: 'Category',
      render: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          {c.imageUrl ? (
            <img src={c.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <Icon name="utensils" className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <strong className="block truncate">{c.name}</strong>
            <p className="truncate text-xs text-foreground-muted">searches “{c.searchTerm}”</p>
          </div>
        </div>
      ),
    },
    { key: 'featured', header: 'On home', render: (c) => <Badge tone={c.featured ? 'primary' : 'neutral'} variant="soft">{c.featured ? 'Shown' : 'Hidden'}</Badge> },
    { key: 'status', header: 'Status', render: (c) => <StatusPill tone={c.status === 'active' ? 'success' : 'neutral'}>{c.status}</StatusPill> },
    {
      key: 'order',
      header: 'Order',
      align: 'right',
      render: (c) => {
        const i = q.items.findIndex((x) => x.id === c.id);
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Button size="sm" variant="ghost" leftIcon="chevronUp" aria-label="Move up" onClick={(e) => { e.stopPropagation(); void move(i, -1); }} />
            <Button size="sm" variant="ghost" leftIcon="chevronDown" aria-label="Move down" onClick={(e) => { e.stopPropagation(); void move(i, 1); }} />
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => <Button size="sm" variant="ghost" leftIcon="delete" aria-label={`Delete ${c.name}`} onClick={(e) => { e.stopPropagation(); void remove(c); }} />,
    },
  ];

  return (
    <ManagementPage
      title="Browse categories"
      description="The circular category tiles customers tap on the home screen."
      actions={<Button leftIcon="add" onClick={() => setDraft(emptyCategory())}>New category</Button>}
    >
      <ManagementTable
        rows={q.items}
        columns={columns}
        getId={(c) => c.id}
        loading={q.isLoading}
        onRowClick={(c) => setDraft({ ...c })}
        emptyTitle="No categories yet"
        emptyDescription="Add tiles like Milkshakes or Desserts to help customers browse."
        emptyIcon="grid"
      />

      <EntityDrawer
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit category' : 'New category'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button loading={saving} onClick={() => void save()}>{draft?.id ? 'Save changes' : 'Create category'}</Button>
          </div>
        }
      >
        {draft && (
          <>
            {/* Live tile preview — exactly how it renders on the home screen. */}
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-raised p-5">
              <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-border bg-surface shadow-sm">
                {draft.imageUrl ? (
                  <img src={draft.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
                    <Icon name="utensils" className="h-4.5 w-4.5" />
                  </span>
                )}
              </span>
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-foreground-muted">
                {draft.name || 'Category'}
              </span>
            </div>

            <Field label="Name" required>
              <Input value={draft.name ?? ''} onChange={(e) => patch({ name: e.target.value })} placeholder="Milkshakes" />
            </Field>

            <ImageUploadField
              label="Tile image"
              hint="Square artwork works best. Falls back to an icon when empty."
              aspect="aspect-square"
              className="max-w-56"
              value={draft.imageUrl}
              onChange={(url) => patch({ imageUrl: url })}
              upload={(file, onProgress) => adminService.uploadImage(file, 'categories', onProgress)}
            />

            <Field label="Search term" description="What tapping this tile searches for. Defaults to the name.">
              <Input value={draft.searchTerm ?? ''} onChange={(e) => patch({ searchTerm: e.target.value })} placeholder="Milkshakes" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display order" description="Lower numbers show first.">
                <Input type="number" value={String(draft.sortOrder ?? 0)} onChange={(e) => patch({ sortOrder: Number(e.target.value) })} />
              </Field>
              <div className="space-y-3">
                <Field label="Show on home" orientation="horizontal">
                  <Switch checked={Boolean(draft.featured)} onCheckedChange={(on) => patch({ featured: on })} />
                </Field>
                <Field label="Active" orientation="horizontal">
                  <Switch checked={draft.status === 'active'} onCheckedChange={(on) => patch({ status: on ? 'active' : 'inactive' })} />
                </Field>
              </div>
            </div>

            <Card padding="md" className="bg-surface-raised">
              <p className="text-xs text-foreground-muted">
                Categories tagged “show on home” appear as tiles in display order. Customers tapping one land on search
                results for the term above.
              </p>
            </Card>
          </>
        )}
      </EntityDrawer>
    </ManagementPage>
  );
}
