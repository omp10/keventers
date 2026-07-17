import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Reveal } from '@/animations';
import { useCapabilities } from '@/platform/capabilities';
import { LocationPrompt } from '../location/LocationPrompt';
import { useDiscoveryOrigin } from '../location';
import { useFeaturedBranches, usePopularBranches } from '../hooks';
import { HomeHero } from './HomeHero';
import { PromoCarousel } from './PromoCarousel';
import { CategoryChips, deriveTopCuisines } from './CategoryChips';
import { ContinueOrderingCard } from './ContinueOrderingCard';
import { LoyaltyTeaser } from './LoyaltyTeaser';
import { SignInPrompt } from './SignInPrompt';
import { FavoritesRail, NearbyRail, PopularRail, RecentRail, FeaturedRail } from './HomeRails';
import type { PlaceSuggestion } from '../types';

/**
 * HomeScreen — the flagship landing experience. ONE adaptive page (no separate
 * mobile/desktop apps): device CAPABILITIES reorder the same building blocks
 * (scanner-capable phones lead with the QR CTA; pointer devices lead with
 * discovery). The scroll tells a story — hero → offers → categories → resume →
 * rails → rewards — with one-shot reveals guiding attention section by section.
 * All data comes from existing hooks/stores; all styling from theme tokens.
 */
export function HomeScreen() {
  const caps = useCapabilities();
  const navigate = useNavigate();
  const origin = useDiscoveryOrigin();
  const [term, setTerm] = useState('');

  const scannerFirst = caps.entrySurface === 'scanner';

  // Shared data (deduped with the rails' queries by TanStack Query).
  const popular = usePopularBranches(origin.point);
  const featured = useFeaturedBranches(origin.point);
  const loadedBranches = useMemo(
    () => [...(popular.data ?? []), ...(featured.data ?? [])],
    [popular.data, featured.data],
  );
  const trendingTerms = useMemo(() => deriveTopCuisines(loadedBranches, 6), [loadedBranches]);

  const submitSearch = (t: string) => navigate(`/search?q=${encodeURIComponent(t)}`);
  const selectSuggestion = (s: PlaceSuggestion) => {
    if (s.slug) return navigate(`/r/${s.slug}`);
    if (s.location) {
      origin.setManualOrigin(s.location, s.label);
      return navigate('/nearby');
    }
    navigate(`/search?q=${encodeURIComponent(s.label)}`);
  };

  return (
    <div className="space-y-8 lg:space-y-12 xl:space-y-14">
      {/* Act 1 — the opening moment */}
      <HomeHero
        scannerFirst={scannerFirst}
        term={term}
        onTermChange={setTerm}
        onSearchSubmit={submitSearch}
        onSuggestionSelect={selectSuggestion}
        searchOrigin={origin.point}
        trendingTerms={trendingTerms}
        locationSlot={
          <LocationPrompt
            origin={origin.origin}
            permission={origin.permission}
            status={origin.status}
            onUseLocation={() => void origin.requestGps()}
            onManualSearch={() => navigate('/search')}
          />
        }
      />

      {/* Act 2 — quick paths + admin-curated offers. The sign-in invitation sits
          here, after the hero has done its job: high enough to be seen on the
          first screen, but never in front of the reason they came. */}
      <Reveal>
        <SignInPrompt />
      </Reveal>
      <CategoryChips branches={loadedBranches} />
      <Reveal>
        <PromoCarousel />
      </Reveal>
      <ContinueOrderingCard />

      {/* Act 3 — discovery rails (each reveals as it enters the viewport) */}
      <div className="space-y-8 lg:space-y-12">
        <NearbyRail point={origin.point} />
        <PopularRail point={origin.point} />
        <FeaturedRail point={origin.point} />
        <RecentRail />
        <FavoritesRail />
      </div>

      {/* Act 4 — rewards close the story */}
      <LoyaltyTeaser />
    </div>
  );
}
