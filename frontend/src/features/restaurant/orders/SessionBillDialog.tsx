import { Badge, Button, Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, Spinner } from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { qk, useQueryResource } from '@/platform/query';
import { staffOrderService } from '../services';

/** Minor units (paise) → a Money the shared formatter understands. */
const money = (amount: number, currency = 'INR') => formatMoney({ amount, currency, major: amount / 100 });

/**
 * SessionBillDialog — ONE bill for the whole sitting.
 *
 * A dine-in session routinely spans several orders (drinks, then food, then
 * dessert). Each is its own immutable order, so billing per order hands the
 * guest three receipts for one meal. This shows every order the table placed,
 * itemised, and totals them from the FROZEN pricing snapshots — it never
 * re-prices, so the bill always equals what was actually charged.
 *
 * Cancelled orders are listed but struck through and excluded from the totals:
 * the table should see what was cancelled and not be charged for it.
 */
export function SessionBillDialog({ orderId, open, onClose }: { orderId?: string; open: boolean; onClose: () => void }) {
  const q = useQueryResource(
    qk('restaurant', 'session-bill', orderId ?? null),
    () => staffOrderService.sessionBill(orderId!),
    { enabled: open && Boolean(orderId) },
  );
  const bill = q.data;
  const currency = bill?.currency ?? 'INR';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Bill</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {q.isLoading ? (
            <div className="grid min-h-40 place-items-center"><Spinner /></div>
          ) : !bill ? (
            <p className="py-8 text-center text-sm text-foreground-muted">Could not load this bill.</p>
          ) : (
            <div id="kv-bill" className="space-y-4 text-sm">
              {/* Header */}
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-border pb-3">
                <div>
                  <p className="text-base font-bold text-foreground">
                    {bill.table?.number != null ? `Table ${bill.table.number}` : bill.table?.name ?? 'Takeaway'}
                  </p>
                  {bill.openedAt && (
                    <p className="text-xs text-foreground-muted">
                      Opened {new Date(bill.openedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <Badge tone="info" variant="soft">
                  {bill.orderCount} order{bill.orderCount === 1 ? '' : 's'} this session
                </Badge>
              </div>

              {/* Every order in the sitting */}
              {bill.orders.map((o) => {
                const cancelled = o.status === 'cancelled';
                return (
                  <div key={o.id} className={cancelled ? 'opacity-50' : undefined}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-foreground">#{o.orderNumber}</span>
                      <span className="text-xs text-foreground-muted">
                        {cancelled ? 'cancelled — not charged' : new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {(o.items ?? []).map((i) => (
                        <div key={i.id} className={`flex justify-between gap-3 ${cancelled ? 'line-through' : ''}`}>
                          <span className="min-w-0 flex-1 truncate text-foreground-muted">
                            {i.quantity} × {i.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-foreground">
                            {money(Number(i.lineTotal?.amount ?? 0), currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Totals */}
              <div className="space-y-1 border-t border-dashed border-border pt-3">
                <Row label="Subtotal" value={money(bill.totals.subtotal, currency)} />
                {bill.totals.discount > 0 && <Row label="Discount" value={`− ${money(bill.totals.discount, currency)}`} muted />}
                {bill.totals.taxes.map((t) => <Row key={t.label} label={t.label} value={money(t.amount, currency)} muted />)}
                {bill.totals.serviceCharge > 0 && <Row label="Service charge" value={money(bill.totals.serviceCharge, currency)} muted />}
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                  <span>Total</span>
                  <span className="tabular-nums">{money(bill.totals.total, currency)}</span>
                </div>
                {bill.totals.paid > 0 && <Row label="Paid" value={`− ${money(bill.totals.paid, currency)}`} muted />}
                <div className={`flex items-center justify-between text-sm font-semibold ${bill.totals.due > 0 ? 'text-danger' : 'text-success'}`}>
                  <span>{bill.totals.due > 0 ? 'Amount due' : 'Settled'}</span>
                  <span className="tabular-nums">{money(bill.totals.due, currency)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogBody>

        {bill && (
          <div className="flex justify-end gap-2 border-t border-border p-3">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            {/* Printing the whole window is deliberate: the browser's own print
                dialog is what staff already know, and it needs no print server. */}
            <Button leftIcon="download" onClick={() => window.print()}>Print bill</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-foreground-muted' : 'text-foreground'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default SessionBillDialog;
