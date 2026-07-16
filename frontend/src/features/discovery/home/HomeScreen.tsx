import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Icon } from '@/design-system';
import { useCapabilities } from '@/platform/capabilities';
import { cn } from '@/lib/cn';
import { SearchBar } from '../search';
import { LocationPrompt } from '../location/LocationPrompt';
import { useDiscoveryOrigin } from '../location';
import { FavoritesRail, NearbyRail, PopularRail, RecentRail, FeaturedRail } from './HomeRails';
import type { PlaceSuggestion } from '../types';

/**
 * HomeScreen — the SINGLE adaptive landing experience. It does NOT branch into
 * separate mobile/desktop apps; it reorders and re-emphasizes the SAME building
 * blocks based on device CAPABILITIES (from the Capability Platform):
 *   · scanner-capable phone → lead with "Scan QR"
 *   · desktop / pointer     → lead with location + search discovery
 * Everything else (rails, search, QR fallback) is shared.
 */
export function HomeScreen() {
  const caps = useCapabilities();
  const navigate = useNavigate();
  const origin = useDiscoveryOrigin();
  const [term, setTerm] = useState('');

  const scannerFirst = caps.entrySurface === 'scanner';

  const submitSearch = (t: string) => navigate(`/search?q=${encodeURIComponent(t)}`);
  const selectSuggestion = (s: PlaceSuggestion) => {
    if (s.slug) return navigate(`/r/${s.slug}`);
    if (s.location) {
      origin.setManualOrigin(s.location, s.label);
      return navigate('/nearby');
    }
    navigate(`/search?q=${encodeURIComponent(s.label)}`);
  };

  const ScanCta = (
    <button
      type="button"
      onClick={() => navigate('/qr')}
      className="group flex w-full items-center gap-4 rounded-2xl bg-primary p-5 text-left text-primary-foreground shadow-lg transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/15">
        <Icon name="qr" className="h-7 w-7" />
      </span>
      <span className="flex-1">
        <span className="block text-lg font-semibold">Scan QR to order</span>
        <span className="block text-sm text-primary-foreground/80">Point your camera at the code on your table</span>
      </span>
      <Icon name="chevronRight" className="h-5 w-5 opacity-80 transition group-hover:translate-x-0.5" />
    </button>
  );

  const searchBlock = (
    <SearchBar value={term} onChange={setTerm} onSubmit={submitSearch} onSelect={selectSuggestion} origin={origin.point} />
  );

  const locationBlock = (
    <LocationPrompt
      origin={origin.origin}
      permission={origin.permission}
      status={origin.status}
      onUseLocation={() => void origin.requestGps()}
      onManualSearch={() => navigate('/search')}
    />
  );

  return (
    <div className="space-y-7">
      {/* Heading (white-label copy — no brand strings) */}
      <header className="space-y-1 pt-1">
        <h1 className="text-2xl font-bold text-foreground">Order in seconds</h1>
        <p className="text-sm text-foreground-muted">Scan a table code, or discover restaurants around you.</p>
      </header>

      {scannerFirst ? (
        <>
          {ScanCta}
          {searchBlock}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" leftIcon="search" onClick={() => navigate('/discover')}>
              Browse restaurants
            </Button>
            {locationBlock}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            {searchBlock}
            {locationBlock}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button leftIcon="search" onClick={() => navigate('/discover')}>
                Explore nearby
              </Button>
              <Button variant="ghost" leftIcon="store" onClick={() => navigate('/discover?view=map')}>
                Open map
              </Button>
            </div>
          </div>
          {/* Desktop keeps QR available but de-emphasized */}
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Icon name="qr" className="h-4 w-4" />
            Already have a QR?
            <Button variant="link" size="sm" onClick={() => navigate('/qr')}>Scan</Button>
            <span aria-hidden>·</span>
            <Button variant="link" size="sm" onClick={() => navigate('/qr/manual')}>Enter code</Button>
          </div>
        </>
      )}

      {/* Shared rails — order tuned by surface */}
      <div className={cn('space-y-7')}>
        <NearbyRail point={origin.point} />
        <PopularRail point={origin.point} />
        <FeaturedRail point={origin.point} />
        <RecentRail />
        <FavoritesRail />
      </div>
    </div>
  );
}
