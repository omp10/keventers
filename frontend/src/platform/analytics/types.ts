/**
 * ANALYTICS PLATFORM — INTERFACES ONLY. This phase defines the contract the app
 * codes against (track/identify/page/group). Concrete providers (GA4, Segment,
 * PostHog, Amplitude…) are intentionally NOT implemented here — apps inject one
 * that satisfies `AnalyticsProvider`. The default is a no-op null object.
 */
export type AnalyticsProperties = Record<string, unknown>;

export type AnalyticsEvent = {
  name: string;
  properties?: AnalyticsProperties;
};

export interface AnalyticsProvider {
  /** Record a user action. */
  track(name: string, properties?: AnalyticsProperties): void;
  /** Associate the current session with a user identity. */
  identify(userId: string, traits?: AnalyticsProperties): void;
  /** Record a page/screen view. */
  page(name: string, properties?: AnalyticsProperties): void;
  /** Associate the user with a group (org/restaurant/tenant). */
  group?(groupId: string, traits?: AnalyticsProperties): void;
  /** Clear identity (e.g. on logout). */
  reset?(): void;
}

/** The null-object provider — safe default so calls never crash when unconfigured. */
export const noopAnalytics: AnalyticsProvider = {
  track: () => {},
  identify: () => {},
  page: () => {},
  group: () => {},
  reset: () => {},
};
