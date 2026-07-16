import { useState } from 'react';

import {
  Button,
  Drawer,
  DrawerContent,
  Icon,
  Input,
  Switch,
} from '@/design-system';
import { cn } from '@/lib/cn';

import { PriceInput, SortableList } from '../components';
import { useModifierMutations } from '../hooks';
import type { ModifierDraft, ModifierGroupDraft } from '../types';

const BLANK: ModifierGroupDraft = { id: '', name: '', required: false, min: 0, max: 1, modifiers: [] };

/** Small field label — keeps the dense form readable without a heavy Field wrapper. */
function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-foreground-muted">
      {children}
    </label>
  );
}

/**
 * ModifierGroupEditor — right drawer to create/edit a reusable modifier group.
 * Edits a local DRAFT; the backend owns min/max validation + pricing. Save routes to
 * create or update via useModifierMutations (toasts handled inside the hook).
 */
export function ModifierGroupEditor({
  groupId,
  group,
  isNew,
  onClose,
}: {
  groupId?: string;
  group?: ModifierGroupDraft;
  isNew?: boolean;
  onClose: () => void;
}) {
  const mm = useModifierMutations();
  const [draft, setDraft] = useState<ModifierGroupDraft>(() => (group ? structuredClone(group) : { ...BLANK }));

  const patch = (p: Partial<ModifierGroupDraft>) => setDraft((d) => ({ ...d, ...p }));

  const addOption = () =>
    setDraft((d) => ({
      ...d,
      modifiers: [
        ...d.modifiers,
        { id: crypto.randomUUID(), name: '', price: { amount: 0, currency: 'INR', major: 0 }, available: true },
      ],
    }));

  const patchOption = (id: string, p: Partial<ModifierDraft>) =>
    setDraft((d) => ({ ...d, modifiers: d.modifiers.map((m) => (m.id === id ? { ...m, ...p } : m)) }));

  const removeOption = (id: string) =>
    setDraft((d) => ({ ...d, modifiers: d.modifiers.filter((m) => m.id !== id) }));

  const reorder = (orderedIds: string[]) =>
    setDraft((d) => ({
      ...d,
      modifiers: orderedIds.map((id, order) => ({ ...d.modifiers.find((m) => m.id === id)!, order })),
    }));

  const save = async () => {
    if (isNew) await mm.createGroup(draft);
    else await mm.updateGroup(groupId!, draft);
    onClose();
  };

  const min = Number.isFinite(draft.min) ? draft.min : 0;
  const max = Number.isFinite(draft.max) ? draft.max : 0;

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} direction="right">
      <DrawerContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{isNew ? 'New modifier group' : 'Edit modifier group'}</h2>
            <p className="mt-0.5 text-xs text-foreground-muted">Reusable options shared across products.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-foreground-muted hover:bg-muted"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <Label htmlFor="mg-name">Name</Label>
            <Input
              id="mg-name"
              value={draft.name}
              placeholder="e.g. Choose your base"
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Required</p>
              <p className="text-xs text-foreground-muted">Guests must pick from this group.</p>
            </div>
            <Switch checked={draft.required} onCheckedChange={(required) => patch({ required })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mg-min">Min</Label>
              <Input
                id="mg-min"
                type="number"
                min={0}
                value={draft.min}
                onChange={(e) => patch({ min: e.target.value === '' ? 0 : Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="mg-max">Max</Label>
              <Input
                id="mg-max"
                type="number"
                min={0}
                value={draft.max}
                onChange={(e) => patch({ max: e.target.value === '' ? 0 : Number(e.target.value) })}
              />
            </div>
          </div>
          <p className="-mt-3 text-xs text-foreground-subtle">
            Guests must choose between {min} and {max} option{max === 1 ? '' : 's'}.
          </p>

          {/* Options */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Options</h3>
              <Button size="xs" variant="outline" leftIcon="add" onClick={addOption}>
                Add option
              </Button>
            </div>

            {draft.modifiers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-foreground-subtle">
                No options yet. Add the choices guests can pick.
              </p>
            ) : (
              <SortableList
                items={draft.modifiers}
                getId={(m) => m.id}
                onReorder={reorder}
                renderItem={(m) => (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2">
                    <span
                      className="cursor-grab text-foreground-subtle active:cursor-grabbing"
                      aria-hidden
                    >
                      <Icon name="chevronsUpDown" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Input
                        size="sm"
                        value={m.name}
                        placeholder="Option name"
                        aria-label="Option name"
                        onChange={(e) => patchOption(m.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="w-28 shrink-0">
                      <PriceInput value={m.price} onChange={(price) => patchOption(m.id, { price })} />
                    </div>
                    <Switch
                      checked={m.available}
                      onCheckedChange={(available) => patchOption(m.id, { available })}
                      aria-label="Available"
                    />
                    <button
                      type="button"
                      aria-label="Remove option"
                      onClick={() => removeOption(m.id)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-foreground-subtle hover:bg-muted hover:text-danger"
                    >
                      <Icon name="delete" className="h-4 w-4" />
                    </button>
                  </div>
                )}
              />
            )}
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">Preview</p>
            <p className="text-sm font-medium text-foreground">
              {draft.name || 'Untitled group'}{' '}
              <span className="text-xs font-normal text-foreground-muted">
                ({draft.required ? 'required' : 'optional'} · {min}–{max})
              </span>
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {draft.modifiers.length === 0 ? (
                <li className="text-xs text-foreground-subtle">No options</li>
              ) : (
                draft.modifiers.map((m) => (
                  <li
                    key={m.id}
                    className={cn('flex items-center justify-between text-xs', !m.available && 'opacity-50 line-through')}
                  >
                    <span className="text-foreground-muted">{m.name || 'Unnamed'}</span>
                    <span className="text-foreground-subtle">{m.price.major ? `+₹${m.price.major}` : 'Free'}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex gap-2 border-t border-border p-4">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={mm.saving} className="flex-1">
            {isNew ? 'Create group' : 'Save changes'}
          </Button>
        </footer>
      </DrawerContent>
    </Drawer>
  );
}
