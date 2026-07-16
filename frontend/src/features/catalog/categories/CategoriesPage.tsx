import { useSearchParams } from 'react-router-dom';

import { Button, EmptyState, Icon, Spinner } from '@/design-system';
import { useCategoryTree } from '../hooks';
import type { Category } from '../types';
import { CategoryEditor } from './CategoryEditor';
import { CategoryTree } from './CategoryTree';

/** Categories management — tree, reorder, bulk actions, and a URL-driven editor drawer. */
export function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategoryTree();
  const [params, setParams] = useSearchParams();

  const editingId = params.get('category') ?? undefined;
  const isNew = params.get('new') === '1';
  const editorOpen = isNew || !!editingId;

  const openNew = () => {
    const next = new URLSearchParams(params);
    next.delete('category');
    next.set('new', '1');
    setParams(next);
  };

  const openEdit = (cat: Category) => {
    const next = new URLSearchParams(params);
    next.delete('new');
    next.set('category', cat.id);
    setParams(next);
  };

  const closeEditor = () => {
    const next = new URLSearchParams(params);
    next.delete('category');
    next.delete('new');
    setParams(next);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Categories</h1>
          <p className="mt-1 text-sm text-foreground-muted">Structure your menu with nested, drag-to-reorder categories.</p>
        </div>
        <Button variant="primary" leftIcon="add" onClick={openNew}>New category</Button>
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-24">
          <Spinner />
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Icon name="grid" className="mb-4 h-10 w-10 text-foreground-subtle" />}
          title="No categories yet"
          description="Create your first category to start organising your menu."
          action={<Button variant="primary" leftIcon="add" onClick={openNew}>New category</Button>}
        />
      ) : (
        <CategoryTree onEdit={openEdit} />
      )}

      {editorOpen && (
        <CategoryEditor
          key={editingId ?? 'new'}
          categoryId={editingId}
          isNew={isNew}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}
