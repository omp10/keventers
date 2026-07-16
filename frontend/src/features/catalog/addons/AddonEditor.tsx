import { useState } from 'react';

import {
  Button,
  Drawer,
  DrawerContent,
  Icon,
  Input,
  Switch,
} from '@/design-system';

import { PriceInput } from '../components';
import { useModifierMutations } from '../hooks';
import type { AddonDraft } from '../types';

const BLANK: AddonDraft = { id: '', name: '', price: { amount: 0, currency: 'INR', major: 0 }, available: true };

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-foreground-muted">
      {children}
    </label>
  );
}

/**
 * AddonEditor — right drawer to create/edit a standalone add-on. Edits a local
 * DRAFT; the backend owns pricing + availability rules. Save routes to create or
 * update via useModifierMutations (toasts handled inside the hook).
 */
export function AddonEditor({
  addonId,
  addon,
  isNew,
  onClose,
}: {
  addonId?: string;
  addon?: AddonDraft;
  isNew?: boolean;
  onClose: () => void;
}) {
  const mm = useModifierMutations();
  const [draft, setDraft] = useState<AddonDraft>(() => (addon ? structuredClone(addon) : { ...BLANK }));

  const patch = (p: Partial<AddonDraft>) => setDraft((d) => ({ ...d, ...p }));

  const save = async () => {
    if (isNew) await mm.createAddon(draft);
    else await mm.updateAddon(addonId!, draft);
    onClose();
  };

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} direction="right">
      <DrawerContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <header className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{isNew ? 'New add-on' : 'Edit add-on'}</h2>
            <p className="mt-0.5 text-xs text-foreground-muted">A standalone extra guests can add to an order.</p>
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

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <Label htmlFor="ad-name">Name</Label>
            <Input
              id="ad-name"
              value={draft.name}
              placeholder="e.g. Extra cheese"
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="ad-price">Price</Label>
            <PriceInput id="ad-price" value={draft.price} onChange={(price) => patch({ price })} />
          </div>

          <div>
            <Label htmlFor="ad-group">Group</Label>
            <Input
              id="ad-group"
              value={draft.group ?? ''}
              placeholder="Optional — e.g. Sauces"
              onChange={(e) => patch({ group: e.target.value || undefined })}
            />
            <p className="mt-1 text-xs text-foreground-subtle">Add-ons with the same group are shown together.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Available</p>
              <p className="text-xs text-foreground-muted">Show this add-on to guests.</p>
            </div>
            <Switch checked={draft.available} onCheckedChange={(available) => patch({ available })} />
          </div>
        </div>

        <footer className="flex gap-2 border-t border-border p-4">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={mm.saving} className="flex-1">
            {isNew ? 'Create add-on' : 'Save changes'}
          </Button>
        </footer>
      </DrawerContent>
    </Drawer>
  );
}
