import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useCapabilities } from '@/platform/capabilities';
import { useLocation as useGeoLocation } from '@/platform/location';
import { readOrigin } from '../location/origin-cache';
import { getActiveBranchSlug, hasActiveGuestSession } from './session-context';
import { resolveEntry, type EntryContext, type EntryDecision, type EntryEngineConfig } from './resolve-entry';

/**
 * useEntryDecision — assembles the live Entry Engine context from the platforms
 * (capabilities, auth session, location permission, URL) and returns the resolved
 * decision. The Entry page renders/redirects from `decision`; the logic itself is
 * the pure `resolveEntry`.
 */
export function useEntryDecision(config?: EntryEngineConfig): { decision: EntryDecision; context: EntryContext } {
  const caps = useCapabilities();
  const geo = useGeoLocation();
  const [params] = useSearchParams();

  const context = useMemo<EntryContext>(() => {
    const directBranchSlug = params.get('r');
    const qrCode = params.get('code') || params.get('qr');
    return {
      hasActiveSession: hasActiveGuestSession(),
      activeBranchSlug: getActiveBranchSlug(),
      directBranchSlug,
      qrCode,
      entrySurface: caps.entrySurface,
      formFactor: caps.formFactor,
      camera: caps.camera,
      locationPermission: geo.permission,
      hasCachedOrigin: Boolean(readOrigin()),
    };
  }, [params, caps.entrySurface, caps.formFactor, caps.camera, geo.permission]);

  const decision = useMemo(() => resolveEntry(context, config), [context, config]);

  return { decision, context };
}
