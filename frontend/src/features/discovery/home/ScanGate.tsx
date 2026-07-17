import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/design-system';
import { ScannerExperience, type ScannerResolution } from '../scanner';
import { setActiveBranchSlug } from '../entry';

/**
 * ScanGate — what a diner meets at "/".
 *
 * This product starts at a table, not in a search box: the camera opens
 * immediately and the QR is the way in. The gate has to cover the app's own tab
 * bar — a "scan first" screen you can tab straight past isn't a gate.
 *
 * PORTALLED to <body> on purpose. The shell renders pages inside
 * `<main class="relative z-10">`, which opens a stacking context: any z-index
 * used in here is ranked INSIDE that context, so the tab bar (a z-100 sibling of
 * main) still won on top and stayed clickable through the "overlay". Escaping to
 * the body is what actually makes this a gate.
 *
 * Browsing is the one deliberate exit, so nobody with a dead camera (or a
 * desktop) is trapped. It's a per-visit choice, not a saved preference: land
 * again and you're back at the camera, which is what you want at a table.
 */
export function ScanGate({ onBrowse }: { onBrowse: () => void }) {
  const navigate = useNavigate();

  const opened = (r: ScannerResolution) => {
    setActiveBranchSlug(r.branchSlug);
    // Straight to the menu — scanning should end in food, not a landing page.
    navigate(`/r/${r.branchSlug}/menu`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <div className="mx-auto w-full max-w-md">
          <header className="space-y-1 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Scan to order</h1>
            <p className="text-sm text-foreground-muted">
              Point your camera at the QR code on your table to see the menu.
            </p>
          </header>
          <ScannerExperience className="mt-5" onResolved={opened} />
        </div>
      </div>

      {/* The only way out that isn't a scan. */}
      <div
        className="border-t border-border bg-surface/95 px-5 py-3 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <Button variant="ghost" fullWidth leftIcon="search" onClick={onBrowse}>
          Browse restaurants
        </Button>
      </div>
    </div>,
    document.body,
  );
}
