import { useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useEntryDecision } from '../entry';
import { HomeScreen } from '../home/HomeScreen';
import { ScanGate } from '../home/ScanGate';

/**
 * EntryPage ("/") — the Smart Entry Engine surface. It resolves the optimal entry
 * and either redirects (direct branch / QR / resume) or gates on the scanner.
 *
 * The DEFAULT is the camera. This product starts at a table: the QR is the front
 * door, and discovery is the detour — so "/" opens the scanner and the tab bar
 * stays behind it until the diner either scans or explicitly chooses to browse.
 *
 * Someone mid-session (`resume-session`) skips the gate — they've already
 * scanned; re-asking would be theatre.
 */
/**
 * "I chose to browse" survives a RELOAD but not a new visit.
 *
 * This lived in plain component state, so refreshing "/" threw the diner back
 * to the camera they had already dismissed — every reload re-gated them. Session
 * storage is the exact scope wanted: the QR is still the front door when someone
 * opens the site, but pressing refresh (or coming back via the tab bar) keeps
 * them where they were.
 */
const BROWSING_KEY = 'kv-entry-browsing';
const readBrowsing = () => {
  try {
    return sessionStorage.getItem(BROWSING_KEY) === '1';
  } catch {
    return false;
  }
};

export function EntryPage() {
  const { decision } = useEntryDecision();
  const [browsing, setBrowsing] = useState(readBrowsing);

  const startBrowsing = () => {
    try {
      sessionStorage.setItem(BROWSING_KEY, '1');
    } catch {
      /* private mode — the choice just won't survive a reload */
    }
    setBrowsing(true);
  };

  switch (decision.kind) {
    case 'open-branch':
      return <Navigate to={`/r/${decision.slug}`} replace />;
    case 'resolve-qr':
      return <Navigate to={`/qr?code=${encodeURIComponent(decision.code)}`} replace />;
    case 'resume-session':
      // Already at a table — straight to the home they know.
      return <HomeScreen />;
    default:
      return browsing ? <HomeScreen /> : <ScanGate onBrowse={startBrowsing} />;
  }
}
