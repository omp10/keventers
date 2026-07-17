import { tokenStore } from '@/platform/auth';
import type { AnalyticsProperties, AnalyticsProvider } from './types';

/**
 * HTTP SINK — the platform's OWN journey store. Clarity shows WHY (replays);
 * this feeds the dashboard's per-customer journey timeline (WHAT happened, in
 * order, per visit).
 *
 * A `journeyId` (one per visit, sessionStorage) stitches events together;
 * events batch in memory and flush every few seconds, at 20 events, or on
 * pagehide via `fetch(keepalive)` so the tail of a journey isn't lost when the
 * tab closes. The guest session token rides along when present so the backend
 * can bind the journey to a tenant + table session without trusting the client.
 * Failures are swallowed — analytics must never break ordering.
 */
const JOURNEY_KEY = 'kv-journey-id';
const FLUSH_MS = 5000;
const MAX_BATCH = 20;

function journeyId(): string {
  try {
    let id = sessionStorage.getItem(JOURNEY_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(JOURNEY_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

type PendingEvent = { journeyId: string; event: string; at: string; properties?: AnalyticsProperties };

export function createJourneySink(apiBaseUrl: string): AnalyticsProvider {
  const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/public/journey/events`;
  let queue: PendingEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (useKeepalive = false) => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (queue.length === 0) return;
    const events = queue.splice(0, MAX_BATCH * 2);
    const guest = tokenStore.getGuest();
    void fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(guest ? { authorization: `Bearer ${guest}` } : {}),
      },
      body: JSON.stringify({ events }),
      keepalive: useKeepalive,
    }).catch(() => { /* analytics must never surface an error */ });
  };

  const schedule = () => {
    if (queue.length >= MAX_BATCH) return flush();
    if (!timer) timer = setTimeout(() => flush(), FLUSH_MS);
  };

  if (typeof window !== 'undefined') {
    // pagehide over unload — fires reliably on mobile tab switches/closes.
    window.addEventListener('pagehide', () => flush(true));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush(true);
    });
  }

  return {
    track(name, properties) {
      queue.push({ journeyId: journeyId(), event: name, at: new Date().toISOString(), properties });
      schedule();
    },
    identify(_userId, traits) {
      // Identity is itself a journey fact (phone lands on the event so the
      // dashboard can show WHO, per the client's requirement).
      queue.push({ journeyId: journeyId(), event: 'customer_recognized', at: new Date().toISOString(), properties: traits });
      schedule();
    },
    page(name, properties) {
      queue.push({ journeyId: journeyId(), event: 'page_viewed', at: new Date().toISOString(), properties: { ...properties, page: name } });
      schedule();
    },
    group: () => {},
    reset: () => {
      try { sessionStorage.removeItem(JOURNEY_KEY); } catch { /* ignore */ }
    },
  };
}
