import { useState } from 'react';

import { Badge, Button, Card, EmptyState, Icon, Spinner } from '@/design-system';
import { qk, useQueryResource } from '@/platform/query';
import { useRestaurantScope, useScopedApi } from '../RestaurantScope';

/**
 * Customer Journeys (/dashboard/journeys) — the client's "show me each
 * customer's travel" view. Lists recent visits (one row per journey) with how
 * deep the funnel went; expanding a row loads its full ordered timeline
 * (scanned → browsed → cart → ordered), fed by the customer app's journey sink.
 */
type JourneyRow = {
  journeyId: string;
  startedAt: string;
  lastAt: string;
  events: number;
  stage: number;
  stageLabel: string;
  lastEvent: string;
  outletSlug: string | null;
  customerPhone: string | null;
};

type JourneyStep = { event: string; stage: number; at: string; properties: Record<string, unknown> };

const STAGE_TONES: Record<string, 'neutral' | 'info' | 'primary' | 'warning' | 'success'> = {
  Scanned: 'neutral',
  Verified: 'info',
  Browsed: 'info',
  Cart: 'warning',
  Checkout: 'warning',
  Ordered: 'success',
  Tracked: 'success',
  Feedback: 'success',
};

const EVENT_LABEL: Record<string, string> = {
  qr_scanned: 'Scanned a table QR',
  outlet_identified: 'Outlet identified',
  otp_requested: 'Requested OTP',
  customer_recognized: 'Signed in (repeat customer)',
  registration_completed: 'Registered (new customer)',
  menu_loaded: 'Opened the menu',
  category_viewed: 'Browsed a category',
  search_performed: 'Searched the menu',
  product_opened: 'Opened a product',
  added_to_cart: 'Added to cart',
  cart_viewed: 'Viewed the cart',
  coupon_applied: 'Applied a coupon',
  checkout_started: 'Started checkout',
  order_placed: 'Placed the order',
  order_tracked: 'Tracked the order',
  feedback_submitted: 'Left feedback',
  page_viewed: 'Viewed a page',
};

function StepDetail({ p }: { p: Record<string, unknown> }) {
  const interesting = ['productSlug', 'productId', 'categorySlug', 'couponCode', 'query', 'orderId', 'value']
    .filter((k) => p[k] != null)
    .map((k) => `${k}: ${String(p[k])}`);
  if (!interesting.length) return null;
  return <span className="text-xs text-foreground-subtle">{interesting.join(' · ')}</span>;
}

function Timeline({ journeyId }: { journeyId: string }) {
  const sapi = useScopedApi();
  const scope = useRestaurantScope();
  const q = useQueryResource<JourneyStep[]>(
    qk('restaurant', 'journey', journeyId, scope ?? null),
    () => sapi.get(`/restaurant/analytics/journeys/${journeyId}`),
  );
  if (q.isLoading) return <div className="grid place-items-center py-6"><Spinner size="sm" /></div>;
  const steps = q.data ?? [];
  return (
    <ol className="mt-3 space-y-0 border-l-2 border-border pl-4">
      {steps.map((s, i) => (
        <li key={i} className="relative pb-3">
          <span className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-medium text-foreground">{EVENT_LABEL[s.event] ?? s.event}</span>
            <span className="text-xs text-foreground-subtle">{new Date(s.at).toLocaleTimeString()}</span>
          </div>
          <StepDetail p={s.properties} />
        </li>
      ))}
    </ol>
  );
}

/** Stage-by-stage funnel: how many journeys got AT LEAST this far + drop-off. */
function Funnel({ rows }: { rows: JourneyRow[] }) {
  const stages = [
    { at: 1, label: 'Scanned' },
    { at: 3, label: 'Browsed menu' },
    { at: 4, label: 'Added to cart' },
    { at: 5, label: 'Checkout' },
    { at: 6, label: 'Ordered' },
  ];
  const total = rows.length;
  const reached = stages.map((s) => rows.filter((r) => r.stage >= s.at).length);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Conversion funnel <span className="font-normal text-foreground-subtle">(last {total} journeys)</span></h2>
      <div className="space-y-2">
        {stages.map((s, i) => {
          const n = reached[i];
          const pct = total ? Math.round((n / total) * 100) : 0;
          const prev = i === 0 ? total : reached[i - 1];
          const drop = prev > 0 ? Math.round(((prev - n) / prev) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs font-medium text-foreground">{s.label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                <div className="flex h-full items-center rounded bg-primary pl-2 text-[0.625rem] font-semibold text-primary-foreground" style={{ width: `${Math.max(pct, 4)}%` }}>
                  {n}
                </div>
              </div>
              <span className="w-24 shrink-0 text-right text-xs text-foreground-subtle">
                {pct}%{i > 0 && drop > 0 ? ` · −${drop}%` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function JourneysPage() {
  const [open, setOpen] = useState<string | null>(null);
  const sapi = useScopedApi();
  const scope = useRestaurantScope();
  const q = useQueryResource<JourneyRow[]>(
    qk('restaurant', 'journeys', scope ?? null),
    () => sapi.get('/restaurant/analytics/journeys', { query: { limit: 50 } }),
    { refetchInterval: 30_000 },
  );

  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Customer journeys</h1>
          <p className="text-sm text-foreground-muted">Every visit, from scan to order — how far each customer got and where they stalled.</p>
        </div>
        <Button variant="ghost" size="sm" leftIcon="refresh" onClick={() => void q.refetch()} loading={q.isFetching}>Refresh</Button>
      </div>

      {/* SOW: the funnel with drop-off percentages at every stage. Computed
          from the journeys loaded below — recent traffic, which is what the
          "where do people stall" question is really about. */}
      {rows.length > 0 && <Funnel rows={rows} />}

      {q.isLoading ? (
        <div className="grid min-h-[40vh] place-items-center"><Spinner /></div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Icon name="trend" className="h-8 w-8" />}
          title="No journeys yet"
          description="As customers scan and order, their step-by-step journeys appear here."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.journeyId} padding="md" className="cursor-pointer" onClick={() => setOpen(open === r.journeyId ? null : r.journeyId)}>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={STAGE_TONES[r.stageLabel] ?? 'neutral'} variant="soft">{r.stageLabel}</Badge>
                <span className="text-sm font-medium text-foreground">{r.customerPhone ?? 'Guest'}</span>
                {r.outletSlug && <span className="text-xs text-foreground-subtle">{r.outletSlug}</span>}
                <span className="ml-auto flex items-center gap-3 text-xs text-foreground-subtle">
                  <span>{r.events} steps</span>
                  <span>{new Date(r.lastAt).toLocaleString()}</span>
                  <Icon name={open === r.journeyId ? 'chevronUp' : 'chevronDown'} className="h-4 w-4" />
                </span>
              </div>
              {open === r.journeyId && <Timeline journeyId={r.journeyId} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
