import type { EntrySurface, FormFactor } from '@/platform/capabilities';
import type { GeoPermission } from '@/platform/location';

/**
 * SMART ENTRY ENGINE (pure core). Every customer entering the app flows through
 * this. Given a snapshot of context, it returns the OPTIMAL entry decision. It is
 * pure + fully configurable, so it's trivially testable and reusable across apps
 * (kiosk, white-label, embedded). No React, no I/O.
 *
 *   active guest session      → resume
 *   QR opened directly (url)  → open that branch
 *   QR code param / manual    → resolve that code
 *   phone + camera            → scanner-first
 *   desktop                   → discovery
 *   GPS granted / cached      → nearby
 *   GPS denied                → manual search
 */
export type EntryContext = {
  hasActiveSession: boolean;
  activeBranchSlug?: string | null;
  /** A branch slug from a directly-opened /r/:slug or QR URL. */
  directBranchSlug?: string | null;
  /** A raw/token QR code from ?code= or manual entry. */
  qrCode?: string | null;
  entrySurface: EntrySurface;
  formFactor: FormFactor;
  camera: boolean;
  locationPermission: GeoPermission;
  hasCachedOrigin: boolean;
};

export type EntryDecision =
  | { kind: 'resume-session'; branchSlug?: string | null }
  | { kind: 'open-branch'; slug: string }
  | { kind: 'resolve-qr'; code: string }
  | { kind: 'scanner-first' }
  | { kind: 'discovery-nearby' }
  | { kind: 'discovery-search' }
  | { kind: 'discovery-home' };

export type EntryEngineConfig = {
  /** Force a surface regardless of device (e.g. a kiosk that is scanner-only). */
  surfaceOverride?: EntrySurface;
  /** Resume an existing guest session when present. Default true. */
  resumeSessions?: boolean;
  /** Honor QR direct-open / codes. Default true. */
  respectQr?: boolean;
  /** Require a camera for scanner-first (else fall back to discovery). Default true. */
  requireCameraForScanner?: boolean;
};

const DEFAULTS: Required<EntryEngineConfig> = {
  surfaceOverride: undefined as unknown as EntrySurface,
  resumeSessions: true,
  respectQr: true,
  requireCameraForScanner: true,
};

export function resolveEntry(ctx: EntryContext, config: EntryEngineConfig = {}): EntryDecision {
  const cfg = { ...DEFAULTS, ...config };

  // 1. Direct QR / branch open always wins — the user asked for a specific place.
  if (cfg.respectQr) {
    if (ctx.directBranchSlug) return { kind: 'open-branch', slug: ctx.directBranchSlug };
    if (ctx.qrCode) return { kind: 'resolve-qr', code: ctx.qrCode };
  }

  // 2. Resume an in-progress session.
  if (cfg.resumeSessions && ctx.hasActiveSession) {
    return { kind: 'resume-session', branchSlug: ctx.activeBranchSlug ?? null };
  }

  // 3. Choose the surface from capabilities (or an explicit override).
  const surface: EntrySurface = cfg.surfaceOverride ?? ctx.entrySurface;
  if (surface === 'scanner' && (!cfg.requireCameraForScanner || ctx.camera)) {
    return { kind: 'scanner-first' };
  }

  // 4. Discovery surface — tune by location availability.
  if (ctx.locationPermission === 'granted' || ctx.hasCachedOrigin) return { kind: 'discovery-nearby' };
  if (ctx.locationPermission === 'denied') return { kind: 'discovery-search' };
  return { kind: 'discovery-home' };
}
