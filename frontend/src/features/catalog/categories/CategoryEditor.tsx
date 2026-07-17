import { useMemo, useState } from 'react';

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Switch,
  Textarea,
} from '@/design-system';
import { cn } from '@/lib/cn';
import { useCategories, useCategoryMutations, useCategoryTree } from '../hooks';
import { MediaManager } from '../media';
import type { Category } from '../types';

type CategoryDraft = {
  name: string;
  description?: string;
  parentId?: string | null;
  order: number;
  icon?: string;
  image?: Category['image'];
  visible: boolean;
};

/** Flatten the nested category tree to a lookup-friendly list. */
function flatten(nodes: Category[], acc: Category[] = []): Category[] {
  for (const n of nodes) {
    acc.push(n);
    if (n.children?.length) flatten(n.children, acc);
  }
  return acc;
}

const blankDraft = (parentId?: string | null): CategoryDraft => ({
  name: '',
  description: '',
  parentId: parentId ?? null,
  order: 0,
  icon: '',
  image: null,
  visible: true,
});

const fromCategory = (c: Category): CategoryDraft => ({
  name: c.name,
  description: c.description ?? '',
  parentId: c.parentId ?? null,
  order: c.order,
  icon: c.icon ?? '',
  image: c.image ?? null,
  visible: c.visible,
});

/** Right-side drawer to create or edit a category. */
export function CategoryEditor({
  categoryId,
  isNew,
  parentId,
  category,
  onClose,
}: {
  categoryId?: string;
  isNew?: boolean;
  parentId?: string | null;
  category?: Category;
  onClose: () => void;
}) {
  const { data: tree = [] } = useCategoryTree();
  const { data: allCategories = [] } = useCategories();
  const cm = useCategoryMutations();

  const seed = useMemo<Category | undefined>(() => {
    if (category) return category;
    if (categoryId) return flatten(tree).find((c) => c.id === categoryId);
    return undefined;
  }, [category, categoryId, tree]);

  const [draft, setDraft] = useState<CategoryDraft>(() =>
    isNew || !seed ? blankDraft(parentId) : fromCategory(seed),
  );
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<CategoryDraft>) => setDraft((d) => ({ ...d, ...p }));

  /**
   * The menu is two levels deep, so only a MAIN category can be a parent — and a
   * category that already has subcategories can't become one itself (that would
   * push its children to level 3). The service rejects both; we don't offer them,
   * because a dropdown that lists a choice the save will refuse is a trap.
   */
  const hasChildren = Boolean(seed?.children?.length);
  const parentOptions = allCategories.filter((c) => c.id !== categoryId && !c.parentId);

  const save = async () => {
    if (!draft.name.trim()) return;
    const payload = { ...draft, name: draft.name.trim(), description: draft.description?.trim() || undefined, icon: draft.icon?.trim() || undefined };
    setSaving(true);
    try {
      if (isNew || !categoryId) await cm.create(payload);
      else await cm.update(categoryId, payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} direction="right">
      <DrawerContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
        <DrawerHeader>
          <DrawerTitle className="text-lg font-semibold text-foreground">
            {isNew || !categoryId ? 'New category' : 'Edit category'}
          </DrawerTitle>
        </DrawerHeader>

        <DrawerBody className="space-y-5">
          <label className="block text-sm font-medium text-foreground">
            Name
            <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Beverages" className="mt-1.5" autoFocus />
          </label>

          <label className="block text-sm font-medium text-foreground">
            Description
            <Textarea value={draft.description ?? ''} onChange={(e) => patch({ description: e.target.value })} placeholder="Optional" rows={3} className="mt-1.5" />
          </label>

          <label className="block text-sm font-medium text-foreground">
            Parent category
            <select
              value={draft.parentId ?? ''}
              onChange={(e) => patch({ parentId: e.target.value || null })}
              disabled={hasChildren}
              className={cn(
                'mt-1.5 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none transition',
                'focus-visible:ring-2 focus-visible:ring-primary/40',
                hasChildren && 'cursor-not-allowed opacity-60',
              )}
            >
              <option value="">None (top level)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs font-normal text-foreground-subtle">
              {hasChildren
                ? 'This category has subcategories of its own, so it has to stay top level.'
                : 'Leave as top level, or nest this under a main category to make it a subcategory.'}
            </p>
          </label>

          <label className="block text-sm font-medium text-foreground">
            Icon
            <Input value={draft.icon ?? ''} onChange={(e) => patch({ icon: e.target.value })} placeholder="Optional icon name or emoji" className="mt-1.5" />
          </label>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Image</p>
            <MediaManager
              images={draft.image ? [draft.image] : []}
              onChange={(imgs) => patch({ image: imgs[0] ?? null })}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Visible</p>
              <p className="text-xs text-foreground-muted">Show this category to customers.</p>
            </div>
            <Switch checked={draft.visible} onCheckedChange={(v) => patch({ visible: v })} />
          </div>
        </DrawerBody>

        <DrawerFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" fullWidth loading={saving} disabled={!draft.name.trim()} onClick={() => void save()}>
            {isNew || !categoryId ? 'Create category' : 'Save changes'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
