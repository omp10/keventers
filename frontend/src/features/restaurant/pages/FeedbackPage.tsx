import { Badge, Card, EmptyState, Icon, Spinner } from '@/design-system';
import { api } from '@/platform/api';
import { qk, useQueryResource } from '@/platform/query';

/**
 * Feedback & NPS (/dashboard/feedback) — the SOW's customer-satisfaction view:
 * the NPS headline, food/service/store rating averages, and the latest
 * comments with who said them.
 */
type Summary = { total: number; nps: number | null; avgFood: number | null; avgService: number | null; avgStore: number | null };
type Row = {
  id: string;
  npsScore: number | null;
  foodRating: number | null;
  serviceRating: number | null;
  storeRating: number | null;
  comment: string;
  createdAt: string;
  customer?: { name?: string; phone?: string } | null;
};

function Stat({ label, value, suffix = '' }: { label: string; value: number | string | null; suffix?: string }) {
  return (
    <Card padding="md" className="text-center">
      <p className="text-2xl font-bold text-foreground">{value ?? '—'}{value != null ? suffix : ''}</p>
      <p className="mt-0.5 text-xs text-foreground-muted">{label}</p>
    </Card>
  );
}

const stars = (n: number | null) => (n == null ? null : '★'.repeat(n) + '☆'.repeat(5 - n));

export function FeedbackPage() {
  const summary = useQueryResource<Summary>(qk('restaurant', 'feedback', 'summary'), () => api.get('/restaurant/feedback/summary'), { refetchInterval: 60_000 });
  const rows = useQueryResource<Row[]>(qk('restaurant', 'feedback', 'list'), () => api.get('/restaurant/feedback', { query: { limit: 50 } }), { refetchInterval: 60_000 });

  const s = summary.data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Feedback & NPS</h1>
        <p className="text-sm text-foreground-muted">What customers said after their orders — the food and the restaurant, rated separately.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="NPS" value={s?.nps ?? null} />
        <Stat label="Responses" value={s?.total ?? 0} />
        <Stat label="Food" value={s?.avgFood ?? null} suffix="/5" />
        <Stat label="Service" value={s?.avgService ?? null} suffix="/5" />
        <Stat label="Store" value={s?.avgStore ?? null} suffix="/5" />
      </div>

      {rows.isLoading ? (
        <div className="grid min-h-32 place-items-center"><Spinner /></div>
      ) : (rows.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Icon name="star" className="h-8 w-8" />}
          title="No feedback yet"
          description="Customers are asked to rate the food and the restaurant right after their order is served."
        />
      ) : (
        <div className="space-y-2">
          {(rows.data ?? []).map((r) => (
            <Card key={r.id} padding="sm" className="flex flex-wrap items-center gap-3">
              {r.npsScore != null && (
                <Badge tone={r.npsScore >= 9 ? 'success' : r.npsScore >= 7 ? 'warning' : 'danger'} variant="soft">
                  NPS {r.npsScore}
                </Badge>
              )}
              <span className="text-sm font-medium text-foreground">{r.customer?.name || r.customer?.phone || 'Guest'}</span>
              <span className="text-xs text-warning">
                {[
                  r.foodRating != null ? `Food ${stars(r.foodRating)}` : null,
                  r.serviceRating != null ? `Service ${stars(r.serviceRating)}` : null,
                  r.storeRating != null ? `Store ${stars(r.storeRating)}` : null,
                ].filter(Boolean).join('  ')}
              </span>
              {r.comment && <span className="w-full text-sm text-foreground-muted">“{r.comment}”</span>}
              <span className="ml-auto text-xs text-foreground-subtle">{new Date(r.createdAt).toLocaleString()}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
