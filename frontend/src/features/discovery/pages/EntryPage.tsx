import { Navigate } from 'react-router-dom';

import { useEntryDecision } from '../entry';
import { HomeScreen } from '../home/HomeScreen';

/**
 * EntryPage ("/") — the Smart Entry Engine surface. It resolves the optimal entry
 * and either redirects (direct branch / QR / resume) or renders the adaptive home.
 * Scanner-first vs discovery-first is handled INSIDE HomeScreen via capabilities,
 * so entry doesn't fork into separate apps.
 */
export function EntryPage() {
  const { decision } = useEntryDecision();

  switch (decision.kind) {
    case 'open-branch':
      return <Navigate to={`/r/${decision.slug}`} replace />;
    case 'resolve-qr':
      return <Navigate to={`/qr?code=${encodeURIComponent(decision.code)}`} replace />;
    case 'resume-session':
      return decision.branchSlug ? <Navigate to={`/r/${decision.branchSlug}`} replace /> : <HomeScreen />;
    default:
      return <HomeScreen />;
  }
}
