import { Badge, Button, Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger, Icon } from '@/design-system';
import { PAYMENT_STATUS_PRESENTATION } from '@/features/ordering';
import { cn } from '@/lib/cn';
import { useKitchenActions } from '../hooks';
import type { KitchenEntry } from '../types';
import { PrepTimer } from './PrepTimer';
import { SlaBadge } from './SlaBadge';

const SLA_BORDER = { on_time: 'border-l-success', approaching: 'border-l-warning', breached: 'border-l-danger' } as const;

/**
 * KitchenOrderCard — the large, high-contrast, touch-first order card (all targets
 * ≥44px, no hover-dependent actions). Shows everything a line cook needs at a
 * glance: order #, table, items + variants/modifiers/notes, a big prep timer, SLA,
 * priority, and payment status (read-only). Primary advance buttons call the backend
 * state machine; recall/refire/cancel/assign are delegated to the parent (which
 * collects a reason). No routing/timer/SLA logic lives here.
 */
export function KitchenOrderCard({
  entry,
  onAssign,
  onRecall,
  onRefire,
  onCancel,
  className,
}: {
  entry: KitchenEntry;
  onAssign?: (e: KitchenEntry) => void;
  onRecall?: (e: KitchenEntry) => void;
  onRefire?: (e: KitchenEntry) => void;
  onCancel?: (e: KitchenEntry) => void;
  className?: string;
}) {
  const actions = useKitchenActions();
  const items = Array.isArray(entry.items) ? entry.items : [];
  const pay = PAYMENT_STATUS_PRESENTATION[entry.paymentStatus] ?? PAYMENT_STATUS_PRESENTATION.pending;
  const allergens = [...new Set(items.flatMap((i) => i.allergens ?? []))];

  return (
    <article
      className={cn(
        // Compact on a phone, full-size on a kitchen tablet/display (md+).
        'flex flex-col gap-2 rounded-2xl border border-l-8 bg-surface p-3 shadow-sm transition md:gap-3 md:p-4',
        SLA_BORDER[entry.sla.state],
        entry.sla.state === 'breached' && 'ring-2 ring-danger/30',
        'animate-[kv-pop-in_180ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none',
        className,
      )}
    >
      {/* Header: order + table + priority | timer */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Every ticket in an outlet shares the RADDI-DIN-<date>- prefix, so
                it carries no information while eating three lines on a phone.
                The tail is what a cook calls out; the full number stays in the
                title for search and for anyone who needs it. */}
            <span
              className="text-lg font-extrabold tracking-tight text-foreground md:text-2xl"
              title={entry.orderNumber}
            >
              #{entry.orderNumber.split('-').pop() || entry.orderNumber}
            </span>
            {entry.priority === 'rush' && <Badge tone="danger" variant="solid">RUSH</Badge>}
            {entry.priority === 'vip' && <Badge tone="accent" variant="solid">VIP</Badge>}
            {(entry.recallCount ?? 0) > 0 && <Badge tone="warning" variant="soft">Recalled ×{entry.recallCount}</Badge>}
            {(entry.refireCount ?? 0) > 0 && <Badge tone="warning" variant="soft">Re-fired ×{entry.refireCount}</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground-muted">
            {entry.tableLabel && <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Icon name="grid" className="h-4 w-4" /> {entry.tableLabel}</span>}
            {entry.channel && <span className="capitalize">{entry.channel.replace('_', ' ')}</span>}
            {entry.station && <span className="inline-flex items-center gap-1"><Icon name="flame" className="h-4 w-4" /> {entry.station.name}</span>}
            {entry.chef && <span className="inline-flex items-center gap-1"><Icon name="user" className="h-4 w-4" /> {entry.chef.name}</span>}
          </div>
        </div>
        <PrepTimer entry={entry} size="md" className="shrink-0" />
      </div>

      <div className="flex items-center gap-2">
        <SlaBadge sla={entry.sla} />
        <Badge tone={pay.tone} variant="soft" className="gap-1"><Icon name="payment" className="h-3 w-3" /> {pay.label}</Badge>
      </div>

      {allergens.length > 0 && (
        <div className="flex items-center gap-1.5 rounded-lg bg-danger-soft px-2.5 py-1.5 text-sm font-semibold text-danger">
          <Icon name="warning" className="h-4 w-4" /> Allergens: {allergens.join(', ')}
        </div>
      )}

      {/* Items */}
      <ul className="space-y-2">
        {items.map((it) => {
          const opts = [it.variantName, ...(it.modifiers ?? []), ...(it.addons ?? [])].filter(Boolean);
          return (
            <li key={it.id} className="flex gap-2 md:gap-3">
              <span className="grid h-6 min-w-6 place-items-center rounded-md bg-primary-soft px-1.5 text-sm font-bold text-primary md:h-7 md:min-w-7 md:text-base">{it.quantity}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight text-foreground md:text-base">{it.name}</span>
                {opts.length > 0 && <span className="block text-xs text-foreground-muted md:text-sm">{opts.join(' · ')}</span>}
                {it.instructions && <span className="mt-0.5 block text-sm font-medium text-warning">“{it.instructions}”</span>}
              </span>
            </li>
          );
        })}
      </ul>

      {(entry.notes || entry.customerNotes) && (
        <div className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
          {entry.notes && <p><span className="font-semibold">Note:</span> {entry.notes}</p>}
          {entry.customerNotes && <p className="text-foreground-muted"><span className="font-semibold">Customer:</span> {entry.customerNotes}</p>}
        </div>
      )}

      {/* Actions — large touch targets */}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <PrimaryActions entry={entry} actions={actions} onAssign={onAssign} onRecall={onRecall} onRefire={onRefire} />
        <Dropdown>
          <DropdownTrigger asChild>
            <Button size="icon-lg" variant="secondary" aria-label="More actions"><Icon name="more" className="h-5 w-5" /></Button>
          </DropdownTrigger>
          <DropdownContent align="end">
            {onAssign && <DropdownItem onSelect={() => onAssign(entry)}>{entry.chef ? 'Reassign' : 'Assign'} chef / station</DropdownItem>}
            <DropdownItem onSelect={() => void actions.setPriority(entry.orderId, entry.priority === 'rush' ? 'normal' : 'rush')}>
              {entry.priority === 'rush' ? 'Clear rush' : 'Mark rush'}
            </DropdownItem>
            {onRecall && <DropdownItem onSelect={() => onRecall(entry)}>Recall</DropdownItem>}
            {onRefire && <DropdownItem onSelect={() => onRefire(entry)}>Re-fire</DropdownItem>}
            <DropdownSeparator />
            <DropdownItem onSelect={() => (onCancel ? onCancel(entry) : void actions.cancel(entry.orderId))} className="text-danger">Cancel order</DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </article>
  );
}

function PrimaryActions({
  entry,
  actions,
  onAssign,
  onRecall,
  onRefire,
}: {
  entry: KitchenEntry;
  actions: ReturnType<typeof useKitchenActions>;
  onAssign?: (e: KitchenEntry) => void;
  onRecall?: (e: KitchenEntry) => void;
  onRefire?: (e: KitchenEntry) => void;
}) {
  const busy = actions.isPending;
  switch (entry.status) {
    case 'pending':
      return (
        <>
          {onAssign && <Button size="lg" variant="secondary" onClick={() => onAssign(entry)}>Assign</Button>}
          <Button size="lg" fullWidth loading={busy} onClick={() => void actions.start(entry.orderId)}>Start</Button>
        </>
      );
    case 'assigned':
      return <Button size="lg" fullWidth loading={busy} onClick={() => void actions.start(entry.orderId)}>Start preparing</Button>;
    case 'preparing':
    case 'recalled':
    case 'refired':
      return (
        <>
          {onRecall && <Button size="lg" variant="secondary" onClick={() => onRecall(entry)}>Recall</Button>}
          <Button size="lg" fullWidth variant="success" loading={busy} onClick={() => void actions.ready(entry.orderId)}>Ready</Button>
        </>
      );
    case 'ready':
      return (
        <>
          {onRefire && <Button size="lg" variant="secondary" onClick={() => onRefire(entry)}>Re-fire</Button>}
          <Button size="lg" fullWidth loading={busy} onClick={() => void actions.serve(entry.orderId)}>Serve</Button>
        </>
      );
    default:
      return <span className="flex-1 text-center text-sm font-medium text-foreground-subtle">Completed</span>;
  }
}
