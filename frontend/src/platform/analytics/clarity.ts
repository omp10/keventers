import type { AnalyticsProperties, AnalyticsProvider } from './types';

/**
 * MICROSOFT CLARITY — session replay + heatmaps, behind the platform's
 * `AnalyticsProvider` contract.
 *
 * Deliberately the ONLY file in the app that knows Clarity exists. Business code
 * calls `useAnalytics().track(...)`; swapping Clarity for anything else is
 * replacing this file. That's the contract the analytics platform was built for.
 *
 * The loader below is Microsoft's documented snippet, transcribed rather than
 * pasted as an opaque blob: it appends an async <script> and queues calls made
 * before it lands, so nothing is lost during the load.
 */
declare global {
  interface Window {
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

const SCRIPT_ID = 'ms-clarity';

/** Idempotent: React StrictMode double-invokes effects in dev. */
function loadClarity(projectId: string) {
  if (typeof document === 'undefined' || document.getElementById(SCRIPT_ID)) return;

  // The shim queues everything until the real SDK replaces window.clarity.
  window.clarity =
    window.clarity ||
    function shim(...args: unknown[]) {
      (window.clarity!.q = window.clarity!.q || []).push(args);
    };

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
  document.head.appendChild(script);
}

/**
 * Clarity's API is narrow, so the contract maps onto it as follows:
 *   · track   → `event` (custom events appear as filterable session signals)
 *   · page    → an `event`, since this is a SPA: Clarity auto-captures real
 *               navigations, but route changes here aren't page loads.
 *   · identify→ `identify` + a `customer_id` tag, so a replay can be found by id.
 *   · group   → tags, so sessions are filterable per outlet — the slice the
 *               client will want across ~200 branches.
 */
export function createClarityAnalytics(projectId: string): AnalyticsProvider {
  loadClarity(projectId);
  const call = (...args: unknown[]) => window.clarity?.(...args);

  return {
    track(name, properties) {
      call('event', name);
      // Clarity's `event` takes no payload, so the properties worth filtering on
      // become tags. Tag values must be strings.
      for (const [key, value] of Object.entries(properties ?? {})) {
        if (value == null) continue;
        call('set', key, String(value));
      }
    },
    identify(userId, traits) {
      call('identify', userId);
      call('set', 'customer_id', userId);
      if (traits?.isNewCustomer != null) call('set', 'new_customer', String(traits.isNewCustomer));
    },
    page(name, properties) {
      call('event', `page:${name}`);
      if (properties?.outletId) call('set', 'outlet_id', String(properties.outletId));
    },
    group(groupId, traits) {
      call('set', 'outlet_id', groupId);
      if (traits?.outletSlug) call('set', 'outlet_slug', String(traits.outletSlug));
    },
    reset() {
      // Clarity has no logout primitive; the tag is what leaks across sessions.
      call('set', 'customer_id', null);
    },
  };
}

/**
 * Fan one event out to several providers.
 *
 * Clarity answers "why did they drop off" (replay, heatmaps); a structured sink
 * answers "how many did" (funnels, aggregates). Neither substitutes for the
 * other, and call sites shouldn't have to know there are two — so composing them
 * happens here, once.
 *
 * A provider that throws must never break the flow it's measuring: analytics is
 * an observer, and a broken observer that takes checkout down with it is a far
 * worse bug than a missing number.
 */
export function composeAnalytics(...providers: AnalyticsProvider[]): AnalyticsProvider {
  const each = (fn: (p: AnalyticsProvider) => void) => {
    for (const p of providers) {
      try {
        fn(p);
      } catch {
        /* an observer must not break what it observes */
      }
    }
  };
  return {
    track: (name, props) => each((p) => p.track(name, props)),
    identify: (id, traits) => each((p) => p.identify(id, traits)),
    page: (name, props) => each((p) => p.page(name, props)),
    group: (id, traits) => each((p) => p.group?.(id, traits)),
    reset: () => each((p) => p.reset?.()),
  };
}

/** Dev sink: prove the taxonomy fires without a Clarity project configured. */
export function createConsoleAnalytics(): AnalyticsProvider {
  const log = (kind: string, ...rest: unknown[]) =>
    // eslint-disable-next-line no-console
    console.debug(`%c[journey] ${kind}`, 'color:#078078;font-weight:600', ...rest);
  return {
    track: (name, props: AnalyticsProperties = {}) => log(name, props),
    identify: (id) => log('identify', id),
    page: (name) => log('page', name),
    group: (id) => log('group', id),
    reset: () => log('reset'),
  };
}
