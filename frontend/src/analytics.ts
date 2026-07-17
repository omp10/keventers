import { env } from '@/config/env';
import {
  composeAnalytics,
  createClarityAnalytics,
  createConsoleAnalytics,
  createJourneySink,
  noopAnalytics,
  setJourneyOutletResolver,
  type AnalyticsContract,
} from '@/platform/analytics';
import { getActiveBranchSlug } from '@/features/discovery';

/**
 * Assemble the app's analytics provider — the ONE place vendors are chosen.
 *
 * This is the composition root's job, not the platform's: the platform defines
 * the contract, the app decides who satisfies it. Everything downstream calls
 * `useJourney()` and stays ignorant of what's behind it.
 *
 * The wiring:
 *   · Clarity   — only when a project id is configured. No id, no third party
 *                 receives anything; that's the right default, not an oversight.
 *   · Console   — dev only, so the journey is verifiable without a Clarity
 *                 project and a typo'd event is visible immediately rather than
 *                 in a dashboard next week.
 *   · Neither   → the platform's no-op, and calls stay harmless.
 */
export function createAppAnalytics(): AnalyticsContract {
  // The platform must not import a feature, so the outlet source is injected.
  setJourneyOutletResolver(getActiveBranchSlug);

  const providers: AnalyticsContract[] = [];
  if (env.analytics.clarityProjectId) providers.push(createClarityAnalytics(env.analytics.clarityProjectId));
  // The platform's OWN sink is unconditional — the dashboard's per-customer
  // journey page reads from it, so without it the page has nothing to show.
  providers.push(createJourneySink(env.api.baseUrl));
  if (env.isDev) providers.push(createConsoleAnalytics());

  if (providers.length === 0) return noopAnalytics;
  return providers.length === 1 ? providers[0] : composeAnalytics(...providers);
}
