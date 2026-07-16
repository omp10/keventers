import { useEffect, useState } from 'react';

import { Button, Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription, Textarea } from '@/design-system';
import { cn } from '@/lib/cn';
import { useKitchenActions } from '../hooks';
import type { KitchenEntry } from '../types';

export type ReasonMode = 'recall' | 'refire' | 'cancel';

const COPY: Record<ReasonMode, { title: string; desc: string; confirm: string; reasons: string[] }> = {
  recall: { title: 'Recall order', desc: 'Send this order back to preparing.', confirm: 'Recall', reasons: ['Wrong item', 'Quality issue', 'Customer changed order', 'Incomplete'] },
  refire: { title: 'Re-fire order', desc: 'Cook this order again.', confirm: 'Re-fire', reasons: ['Went cold', 'Dropped', 'Remake requested', 'Delayed pickup'] },
  cancel: { title: 'Cancel order', desc: 'This cannot be undone.', confirm: 'Cancel order', reasons: ['Out of stock', 'Customer cancelled', 'Duplicate', 'Kitchen error'] },
};

/**
 * RecallRefireDialog — collects a REASON for recall / re-fire / cancel and records
 * it via the backend (audit trail). The reason list + workflow are the backend's;
 * this only captures intent. Reused across the board.
 */
export function RecallRefireDialog({ mode, entry, onClose }: { mode: ReasonMode | null; entry: KitchenEntry | null; onClose: () => void }) {
  const actions = useKitchenActions();
  const [reason, setReason] = useState('');
  const open = Boolean(mode && entry);

  useEffect(() => {
    if (open) setReason('');
  }, [open, entry?.id]);

  if (!mode || !entry) return null;
  const copy = COPY[mode];

  const confirm = async () => {
    const r = reason.trim() || undefined;
    if (mode === 'recall') await actions.recall(entry.orderId, r);
    else if (mode === 'refire') await actions.refire(entry.orderId, r);
    else await actions.cancel(entry.orderId, r);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{copy.title} · #{entry.orderNumber}</DialogTitle>
          <DialogDescription>{copy.desc}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {copy.reasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={cn('rounded-full border px-3 py-2 text-sm font-medium transition', reason === r ? 'border-primary bg-primary-soft text-primary' : 'border-border text-foreground-muted hover:text-foreground')}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Add a reason (optional)" rows={2} />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant={mode === 'cancel' ? 'danger' : 'primary'} loading={actions.isPending} onClick={confirm}>{copy.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
