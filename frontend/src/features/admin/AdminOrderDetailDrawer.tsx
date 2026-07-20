import { Badge, Drawer, DrawerContent, Icon, Separator, Spinner } from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { qk, useQueryResource } from '@/platform/query';
import { cn } from '@/lib/cn';
import { adminService } from './admin.service';

/**
 * ADMIN ORDER DETAIL — the full forensic view of one order.
 *
 * The operational drawer in /dashboard shows a manager what they need to ACT on.
 * This is the platform view: everything the order actually holds, including the
 * parts nobody usually looks at until something has gone wrong — the tax lines
 * and their basis points, the immutable timeline with actor and reason, the
 * pricing-engine line references, and the raw ids needed to trace an order
 * across cart, session, kitchen and payment.
 *
 * Built against the REAL payload of GET /admin/orders/:id rather than an assumed
 * shape: every field below was read off a live response first. Every accessor
 * is defensive, because an order snapshot legitimately omits what did not apply
 * (no coupon, no refund, no table for a takeaway).
 */

/** Money arrives as MINOR units with a `major` twin; formatMoney handles both. */
const money = (m: unknown) => (m == null ? '—' : formatMoney(m as never));

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  placed: 'warning', confirmed: 'info', preparing: 'info', ready: 'success',
  served: 'success', completed: 'success', cancelled: 'danger', refunded: 'danger',
};

function Section({ title, icon, children, count }: { title: string; icon: string; children: React.ReactNode; count?: number }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground-muted">
        <Icon name={icon as never} className="h-3.5 w-3.5" />
        {title}
        {count != null && <Badge tone="neutral" variant="soft">{count}</Badge>}
      </h3>
      {children}
    </section>
  );
}

/** A label/value row. Values wrap and never truncate an id the reader needs. */
function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <span className="shrink-0 text-foreground-muted">{label}</span>
      <span className={cn('text-right text-foreground', mono && 'break-all font-mono text-xs')}>{value ?? '—'}</span>
    </div>
  );
}

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export function AdminOrderDetailDrawer({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const q = useQueryResource(qk('admin', 'order', orderId ?? 'none'), () => adminService.order(orderId as string), {
    enabled: Boolean(orderId),
  });
  const o = q.data as Record<string, never> | undefined;

  return (
    <Drawer open={Boolean(orderId)} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent side="right" className="flex w-full flex-col p-0 sm:max-w-xl">
        {q.isLoading || !o ? (
          <div className="grid flex-1 place-items-center"><Spinner /></div>
        ) : (
          <>
            <header className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">#{String(o.orderNumber ?? '')}</h2>
                <Badge tone={STATUS_TONE[String(o.status)] ?? 'neutral'} variant="soft">{String(o.status ?? '')}</Badge>
                <Badge variant="soft">{String(o.orderType ?? '—')}</Badge>
              </div>
              <p className="mt-1 text-sm text-foreground-muted">
                {(o.restaurant as never as { name?: string })?.name ?? '—'} · {(o.branch as never as { name?: string })?.name ?? '—'} · {when(o.placedAt ?? o.createdAt)}
              </p>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <Section title="Order" icon="order">
                <Row label="Placed" value={when(o.placedAt ?? o.createdAt)} />
                <Row label="Completed" value={when(o.completedAt)} />
                <Row label="Cancelled" value={when(o.cancelledAt)} />
                <Row label="Last updated" value={when(o.updatedAt)} />
                <Row label="Items" value={String(o.itemCount ?? (o.items as never as unknown[])?.length ?? 0)} />
                <Row label="Currency" value={String(o.currency ?? '—')} />
              </Section>

              <Separator />

              <Section title="Where & who" icon="store">
                <Row label="Restaurant" value={(o.restaurant as never as { name?: string })?.name} />
                <Row label="Branch" value={(o.branch as never as { name?: string })?.name} />
                <Row label="Table" value={(o.table as never as { name?: string; number?: string })?.name ?? ((o.table as never as { number?: string })?.number ? `Table ${(o.table as never as { number?: string }).number}` : 'No table')} />
                <Row label="Order type" value={String(o.orderType ?? '—')} />
                <Row label="Customer" value={(o.snapshots as never as { customer?: { name?: string } })?.customer?.name ?? (o.customerUserId ? 'Account' : 'Guest')} />
                <Row label="Phone" value={(o.snapshots as never as { customer?: { phone?: string } })?.customer?.phone} />
              </Section>

              <Separator />

              <Section title="Items" icon="utensils" count={(o.items as never as unknown[])?.length ?? 0}>
                <div className="space-y-2">
                  {((o.items ?? []) as never as Array<Record<string, never>>).map((it, i) => {
                    const product = it.product as never as { name?: string; sku?: string; thumbnailUrl?: string } | undefined;
                    const variantName = (it.variant as never as { name?: string })?.name;
                    const mods = (it.modifiers ?? []) as never as Array<{ name?: string }>;
                    const addons = (it.addons ?? []) as never as Array<{ name?: string }>;
                    return (
                      <div key={String(it.id ?? i)} className="flex gap-3 rounded-lg border border-border p-2.5">
                        {product?.thumbnailUrl && (
                          <img src={product.thumbnailUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" loading="lazy" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            <span className="text-foreground-muted">{String(it.quantity ?? 1)}×</span> {product?.name ?? 'Item'}
                          </p>
                          {variantName ? <p className="text-xs text-foreground-muted">Variant: {variantName}</p> : null}
                          {mods.length > 0 && <p className="text-xs text-foreground-muted">Modifiers: {mods.map((m) => m.name).filter(Boolean).join(', ')}</p>}
                          {addons.length > 0 && <p className="text-xs text-foreground-muted">Add-ons: {addons.map((a) => a.name).filter(Boolean).join(', ')}</p>}
                          {it.specialInstructions ? <p className="mt-1 text-xs italic text-warning">“{String(it.specialInstructions)}”</p> : null}
                          {product?.sku ? <p className="text-[11px] text-foreground-subtle">SKU {product.sku}</p> : null}
                        </div>
                      </div>
                    );
                  })}
                  {!((o.items as never as unknown[])?.length) && <p className="text-sm text-foreground-muted">No items recorded.</p>}
                </div>
              </Section>

              <Separator />

              <Section title="Pricing snapshot" icon="payment">
                {(() => {
                  const p = (o.pricing ?? {}) as never as Record<string, never>;
                  const tax = p.tax as never as { mode?: string; lines?: Array<{ name?: string; bps?: number; amount?: unknown }> } | undefined;
                  return (
                    <>
                      <Row label="Subtotal" value={money(p.subtotal)} />
                      {p.discountedSubtotal != null && <Row label="After discounts" value={money(p.discountedSubtotal)} />}
                      {/* Tax lines carry their BASIS POINTS — the only way to audit
                          why a total came out as it did months later. */}
                      {(tax?.lines ?? []).map((line, i) => (
                        <Row key={i} label={`${line.name ?? 'Tax'} (${((line.bps ?? 0) / 100).toFixed(2)}%${tax?.mode ? `, ${tax.mode}` : ''})`} value={money(line.amount)} />
                      ))}
                      <Row label="Service charge" value={money(p.serviceCharge)} />
                      {p.roundingAdjustment != null && <Row label="Rounding" value={money(p.roundingAdjustment)} />}
                      <Separator className="my-1" />
                      <div className="flex items-center justify-between text-base font-bold text-foreground">
                        <span>Total</span><span>{money(p.total)}</span>
                      </div>
                    </>
                  );
                })()}
              </Section>

              <Separator />

              <Section title="Payment & refund" icon="payment">
                <Row label="Payment status" value={<Badge variant="soft">{String((o.payment as never as { status?: string })?.status ?? 'unknown').replace(/_/g, ' ')}</Badge>} />
                <Row label="Refund status" value={(o.refund as never as { status?: string })?.status ?? 'none'} />
                <Row label="Coupon" value={(o.coupon as never as { code?: string })?.code ?? 'none'} />
              </Section>

              {(o.cancellation as never as { reason?: string })?.reason ? (
                <>
                  <Separator />
                  <Section title="Cancellation" icon="warning">
                    <Row label="Reason" value={(o.cancellation as never as { reason?: string }).reason} />
                    <Row label="Source" value={(o.cancellation as never as { source?: string }).source} />
                  </Section>
                </>
              ) : null}

              <Separator />

              {/* The immutable audit trail: who moved this order, when, and why. */}
              <Section title="Timeline" icon="clock" count={((o.timeline ?? []) as never as unknown[]).length}>
                <ol className="space-y-2">
                  {((o.timeline ?? []) as never as Array<Record<string, never>>).map((t, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground">
                          {String(t.previousStatus ?? 'created')} → <strong>{String(t.newStatus ?? '')}</strong>
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {when(t.at)} · by {String(t.actorType ?? 'system')}
                          {t.reason ? ` · ${String(t.reason)}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>

              {((o.notes ?? []) as never as unknown[]).length > 0 && (
                <>
                  <Separator />
                  <Section title="Notes" icon="edit" count={((o.notes ?? []) as never as unknown[]).length}>
                    {((o.notes ?? []) as never as Array<Record<string, never>>).map((n, i) => (
                      <p key={i} className="rounded border border-border p-2 text-sm">
                        <span className="text-xs text-foreground-muted">{String(n.type ?? 'note')} · {String(n.visibility ?? '')}</span>
                        <br />{String(n.body ?? '')}
                      </p>
                    ))}
                  </Section>
                </>
              )}

              <Separator />

              {/* Raw ids last: rarely read, but the only way to trace an order
                  across cart, session, kitchen and payment when support asks. */}
              <Section title="System references" icon="settings">
                <Row label="Order ID" value={String(o.id ?? '')} mono />
                <Row label="Cart ID" value={String(o.cartId ?? '—')} mono />
                <Row label="Session ID" value={String(o.sessionId ?? '—')} mono />
                <Row label="Guest ID" value={String(o.guestId ?? '—')} mono />
                <Row label="Customer user ID" value={String(o.customerUserId ?? '—')} mono />
                <Row label="Organization ID" value={String(o.organizationId ?? '')} mono />
                <Row label="Restaurant ID" value={String(o.restaurantId ?? '')} mono />
                <Row label="Branch ID" value={String(o.branchId ?? '')} mono />
                <Row label="Table ID" value={String(o.tableId ?? '—')} mono />
                <Row label="Version" value={String(o.version ?? '—')} />
              </Section>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

export default AdminOrderDetailDrawer;
