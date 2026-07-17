import { queryClient, useMutationResource } from '@/platform/query';
import { toast } from '@/design-system';
import {
  addonService,
  categoryService,
  menuService,
  modifierGroupService,
  productService,
  type BulkAction,
  type CategoryBulkAction,
} from '../services';
import type { AddonDraft, Availability, CatalogProduct, Category, Menu, ModifierGroupDraft, Schedule } from '../types';
import { CK } from './keys';

const invalidateCatalog = () => void queryClient.invalidateQueries({ queryKey: CK.scope() });
const ok = (msg: string) => toast.success(msg);
const fail = (e: unknown) => toast.error('Action failed', { description: (e as Error).message });

/** Product mutations — create/update/duplicate/archive/publish/availability/bulk/reorder. */
export function useProductMutations() {
  const useMutation = <TData, TVars>(fn: (v: TVars) => Promise<TData>, msg?: string) =>
    useMutationResource<TData, TVars>(fn, {
      onSuccess: (data) => {
        if (data && typeof data === 'object' && 'id' in (data as object)) queryClient.setQueryData(CK.product((data as unknown as CatalogProduct).id), data);
        invalidateCatalog();
        if (msg) ok(msg);
      },
      onError: fail,
    });

  const create = useMutation<CatalogProduct, Partial<CatalogProduct>>((d) => productService.create(d), 'Product created');
  const update = useMutation<CatalogProduct, { id: string; patch: Partial<CatalogProduct> }>(({ id, patch }) => productService.update(id, patch), 'Saved');
  const duplicate = useMutation<CatalogProduct, string>((id) => productService.duplicate(id), 'Duplicated');
  const archive = useMutation<CatalogProduct, string>((id) => productService.archive(id), 'Archived');
  const publish = useMutation<CatalogProduct, string>((id) => productService.publish(id), 'Published');
  const unpublish = useMutation<CatalogProduct, string>((id) => productService.unpublish(id), 'Unpublished');
  const availability = useMutation<CatalogProduct, { id: string; availability: Availability }>(({ id, availability }) => productService.setAvailability(id, availability), 'Availability updated');
  const bulk = useMutationResource<{ ok: true; affected: number }, { action: BulkAction; ids: string[]; params?: Record<string, unknown> }>(
    ({ action, ids, params }) => productService.bulk(action, ids, params),
    { onSuccess: (r) => { invalidateCatalog(); ok(`${r.affected} updated`); }, onError: fail },
  );

  return {
    create: (d: Partial<CatalogProduct>) => create.mutateAsync(d),
    update: (id: string, patch: Partial<CatalogProduct>) => update.mutateAsync({ id, patch }),
    duplicate: (id: string) => duplicate.mutateAsync(id),
    archive: (id: string) => archive.mutateAsync(id),
    publish: (id: string) => publish.mutateAsync(id),
    unpublish: (id: string) => unpublish.mutateAsync(id),
    setAvailability: (id: string, a: Availability) => availability.mutateAsync({ id, availability: a }),
    bulk: (action: BulkAction, ids: string[], params?: Record<string, unknown>) => bulk.mutateAsync({ action, ids, params }),
    saving: create.isPending || update.isPending,
    bulkPending: bulk.isPending,
  };
}

/** Menu mutations. */
export function useMenuMutations() {
  const useMutation = <TVars>(fn: (v: TVars) => Promise<Menu>, msg: string) =>
    useMutationResource<Menu, TVars>(fn, { onSuccess: () => { invalidateCatalog(); ok(msg); }, onError: fail });
  const create = useMutation<Partial<Menu>>((d) => menuService.create(d), 'Menu created');
  const update = useMutation<{ id: string; patch: Partial<Menu> }>(({ id, patch }) => menuService.update(id, patch), 'Saved');
  const duplicate = useMutation<string>((id) => menuService.duplicate(id), 'Duplicated');
  const archive = useMutation<string>((id) => menuService.archive(id), 'Archived');
  const publish = useMutation<string>((id) => menuService.publish(id), 'Published');
  const setActive = useMutation<string>((id) => menuService.setActive(id), 'Menu activated');
  const schedule = useMutation<{ id: string; schedule: Schedule }>(({ id, schedule }) => menuService.schedule(id, schedule), 'Scheduled');
  return {
    create: (d: Partial<Menu>) => create.mutateAsync(d),
    update: (id: string, patch: Partial<Menu>) => update.mutateAsync({ id, patch }),
    duplicate: (id: string) => duplicate.mutateAsync(id),
    archive: (id: string) => archive.mutateAsync(id),
    publish: (id: string) => publish.mutateAsync(id),
    setActive: (id: string) => setActive.mutateAsync(id),
    schedule: (id: string, s: Schedule) => schedule.mutateAsync({ id, schedule: s }),
  };
}

/** Category mutations. */
export function useCategoryMutations() {
  const useMutation = <TVars>(fn: (v: TVars) => Promise<unknown>, msg?: string) =>
    useMutationResource(fn, { onSuccess: () => { invalidateCatalog(); if (msg) ok(msg); }, onError: fail });
  const create = useMutation<Partial<Category>>((d) => categoryService.create(d), 'Category created');
  const update = useMutation<{ id: string; patch: Partial<Category> }>(({ id, patch }) => categoryService.update(id, patch), 'Saved');
  const reorder = useMutation<{ id: string; parentId: string | null; order: number }[]>((items) => categoryService.reorder(items));
  const visibility = useMutation<{ id: string; visible: boolean }>(({ id, visible }) => categoryService.setVisibility(id, visible));
  const remove = useMutation<string>((id) => categoryService.remove(id), 'Category deleted');
  const bulk = useMutation<{ action: CategoryBulkAction; ids: string[] }>(({ action, ids }) => categoryService.bulk(action, ids), 'Updated');
  return {
    create: (d: Partial<Category>) => create.mutateAsync(d),
    update: (id: string, patch: Partial<Category>) => update.mutateAsync({ id, patch }),
    reorder: (items: { id: string; parentId: string | null; order: number }[]) => reorder.mutateAsync(items),
    setVisibility: (id: string, visible: boolean) => visibility.mutateAsync({ id, visible }),
    remove: (id: string) => remove.mutateAsync(id),
    bulk: (action: CategoryBulkAction, ids: string[]) => bulk.mutateAsync({ action, ids }),
    saving: create.isPending || update.isPending || bulk.isPending || remove.isPending,
  };
}

/** Modifier-group + add-on mutations. */
export function useModifierMutations() {
  const useMutation = <TVars>(fn: (v: TVars) => Promise<unknown>, msg?: string) =>
    useMutationResource(fn, { onSuccess: () => { invalidateCatalog(); if (msg) ok(msg); }, onError: fail });
  const createGroup = useMutation<Partial<ModifierGroupDraft>>((d) => modifierGroupService.create(d), 'Group created');
  const updateGroup = useMutation<{ id: string; patch: Partial<ModifierGroupDraft> }>(({ id, patch }) => modifierGroupService.update(id, patch), 'Saved');
  const createAddon = useMutation<Partial<AddonDraft>>((d) => addonService.create(d), 'Add-on created');
  const updateAddon = useMutation<{ id: string; patch: Partial<AddonDraft> }>(({ id, patch }) => addonService.update(id, patch), 'Saved');
  return {
    createGroup: (d: Partial<ModifierGroupDraft>) => createGroup.mutateAsync(d),
    updateGroup: (id: string, patch: Partial<ModifierGroupDraft>) => updateGroup.mutateAsync({ id, patch }),
    createAddon: (d: Partial<AddonDraft>) => createAddon.mutateAsync(d),
    updateAddon: (id: string, patch: Partial<AddonDraft>) => updateAddon.mutateAsync({ id, patch }),
    saving: createGroup.isPending || updateGroup.isPending || createAddon.isPending || updateAddon.isPending,
  };
}
