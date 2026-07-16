import {
  Badge,
  Button,
  Drawer,
  DrawerContent,
  Icon,
  Separator,
  Spinner,
} from '@/design-system';
import { formatMoney, PriceBreakdown } from '@/features/ordering';
import { cn } from '@/lib/cn';
import { useOrderActions, useOrderDetail } from '../hooks';
import type { OrderStatus, StaffOrderDetail } from '../types';
import { OrderStatusBadge, PaymentStatusBadge } from './OrderStatusBadge';
import { StaffOrderTimeline } from './StaffOrderTimeline';

function Meta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-foreground-subtle">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">{title}</h3>
      {children}
    </section>
  );
}

/** Actions available from a status (drives the footer). */
function actionsFor(status: OrderStatus): { key: 'confirm' | 'start' | 'ready' | 'serve' | 'complete'; label: string; variant?: 'primary' | 'secondary' }[] {
  switch (status) {
    case 'placed':
      return [{ key: 'confirm', label: 'Accept order' }];
    case 'confirmed':
      return [{ key: 'start', label: 'Start preparing' }];
    case 'preparing':
      return [{ key: 'ready', label: 'Mark ready' }];
    case 'ready':
      return [{ key: 'serve', label: 'Mark served', variant: 'secondary' }, { key: 'complete', label: 'Complete' }];
    case 'served':
      return [{ key: 'complete', label: 'Complete' }];
    default:
      return [];
  }
}

/**
 * OrderDetailDrawer — the premium full-height order drawer. Kept LIVE (realtime via
 * `useOrderDetail`), it shows customer/session/table/QR/branch, items with
 * variants/modifiers/add-ons/instructions, coupon, the read-only pricing snapshot,
 * payment status, kitchen status, and the merged timeline. Actions run the backend
 * state machine. No prices are computed here.
 */
export function OrderDetailDrawer({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const open = Boolean(orderId);
  const { data: order, isLoading } = useOrderDetail(orderId ?? undefined);
  const actions = useOrderActions();

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} direction="right">
      <DrawerContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
        {isLoading || !order ? (
          <div className="grid flex-1 place-items-center">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">#{order.orderNumber}</h2>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-0.5 text-xs text-foreground-muted">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <button type="button" aria-label="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-foreground-muted hover:bg-muted">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {/* Meta */}
              <dl className="grid grid-cols-2 gap-3">
                <Meta label="Customer" value={order.customer?.name ?? 'Guest'} />
                <Meta label="Phone" value={order.customer?.phone} />
                <Meta label="Table" value={order.table?.label} />
                <Meta label="QR / code" value={order.qrCode ?? order.table?.code} />
                <Meta label="Channel" value={order.channel} />
                <Meta label="Branch" value={order.branch.name} />
                <Meta label="Session" value={order.guestSessionId ? order.guestSessionId.slice(0, 8) : undefined} />
              </dl>

              <div className="flex flex-wrap items-center gap-2">
                <PaymentStatusBadge status={order.payment.status} />
                {order.kitchen?.slaBreached && <Badge tone="danger" variant="soft">SLA breached</Badge>}
                {order.priority && order.priority !== 'normal' && <Badge tone="accent" variant="soft" className="capitalize">{order.priority}</Badge>}
              </div>

              <Separator />

              {/* Items */}
              <Section title="Items">
                <ul className="space-y-2.5">
                  {order.items.map((it) => {
                    const opts = [it.variantName, ...it.modifiers.map((m) => m.name), ...it.addons.map((a) => a.name)].filter(Boolean);
                    return (
                      <li key={it.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            <span className="text-foreground-muted">{it.quantity}×</span> {it.name}
                          </p>
                          {opts.length > 0 && <p className="text-xs text-foreground-muted">{opts.join(' · ')}</p>}
                          {it.instructions && <p className="text-xs italic text-foreground-subtle">“{it.instructions}”</p>}
                        </div>
                        <span className="shrink-0 text-sm font-medium text-foreground">{formatMoney(it.lineTotal)}</span>
                      </li>
                    );
                  })}
                </ul>
              </Section>

              {order.pricing.couponDiscount && order.pricing.couponDiscount.amount > 0 && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <Icon name="gift" className="h-4 w-4" /> Coupon applied
                </div>
              )}

              {/* Pricing snapshot (read-only) */}
              <Section title="Pricing snapshot">
                <PriceBreakdown pricing={order.pricing} />
              </Section>

              {/* Kitchen */}
              {order.kitchen && (
                <Section title="Kitchen">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
                    {order.kitchen.status && <Badge tone="neutral" variant="soft" className="capitalize">{order.kitchen.status}</Badge>}
                    {order.kitchen.station && <span>Station: {order.kitchen.station}</span>}
                    {order.kitchen.prepMinutes != null && <span>· {order.kitchen.prepMinutes}m prep</span>}
                  </div>
                </Section>
              )}

              {/* Timeline */}
              <Section title="Timeline">
                <StaffOrderTimeline order={order} />
              </Section>
            </div>

            {/* Footer actions */}
            <OrderDetailFooter order={order} actions={actions} />
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function OrderDetailFooter({ order, actions }: { order: StaffOrderDetail; actions: ReturnType<typeof useOrderActions> }) {
  const available = actionsFor(order.status);
  const terminal = order.status === 'completed' || order.status === 'cancelled';
  if (terminal) return null;

  return (
    <footer className="border-t border-border p-4">
      <div className="flex gap-2">
        {available.map((a) => (
          <Button
            key={a.key}
            variant={a.variant ?? 'primary'}
            fullWidth
            loading={actions.isPending}
            onClick={() => void actions[a.key](order.id)}
          >
            {a.label}
          </Button>
        ))}
      </div>
      <Button
        variant="ghost"
        fullWidth
        className={cn('mt-2 text-danger')}
        disabled={actions.isPending}
        onClick={() => void actions.cancel(order.id)}
      >
        Cancel order
      </Button>
    </footer>
  );
}
