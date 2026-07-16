import { type IconName } from '@/design-system';
import { useCapabilities } from '@/platform/capabilities';
import { RestaurantCarousel, RestaurantList } from '../components';
import { useFavoriteBranches, useRecentBranches } from '../favorites';
import { useFeaturedBranches, useNearbyBranches, usePopularBranches, usePrefetchBranch } from '../hooks';
import { HomeSection, type SectionTone } from './HomeSection';
import type { Branch, GeoPoint } from '../types';

/**
 * Generic branch rail — a titled horizontal carousel inside the HomeSection
 * shell (toned icon chip + scroll reveal). Each rail gives its section a
 * distinct personality via `tone`/`subtitle` while sharing one implementation.
 */
export function BranchRail({
  title,
  subtitle,
  icon,
  tone,
  branches,
  loading,
  seeAllHref,
  point,
  layout = 'carousel',
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  tone?: SectionTone;
  branches: Branch[];
  loading?: boolean;
  seeAllHref?: string;
  point?: GeoPoint | null;
  /** 'compact' = short vertical list rows (phone "repeat your favorites"). */
  layout?: 'carousel' | 'compact';
}) {
  const prefetch = usePrefetchBranch(point);
  if (!loading && branches.length === 0) return null;
  return (
    <HomeSection title={title} subtitle={subtitle} icon={icon} tone={tone} seeAllHref={seeAllHref}>
      {layout === 'compact' ? (
        <RestaurantList branches={branches.slice(0, 3)} loading={loading} skeletonCount={2} onPrefetch={prefetch} />
      ) : (
        <RestaurantCarousel branches={branches} loading={loading} onPrefetch={prefetch} />
      )}
    </HomeSection>
  );
}

export function NearbyRail({ point }: { point: GeoPoint | null }) {
  const q = useNearbyBranches(point);
  const branches = (q.data?.pages.flatMap((p) => p.items) ?? []).slice(0, 10) as Branch[];
  if (!point) return null;
  return (
    <BranchRail
      title="Nearby"
      subtitle="Closest to you right now"
      icon="mapPin"
      tone="info"
      branches={branches}
      loading={q.isLoading}
      seeAllHref="/nearby"
      point={point}
    />
  );
}

export function PopularRail({ point }: { point: GeoPoint | null }) {
  const q = usePopularBranches(point);
  return (
    <BranchRail
      title="Trending now"
      subtitle="What everyone's ordering"
      icon="trend"
      tone="primary"
      branches={q.data ?? []}
      loading={q.isLoading}
      seeAllHref="/discover"
      point={point}
    />
  );
}

export function FeaturedRail({ point }: { point: GeoPoint | null }) {
  const q = useFeaturedBranches(point);
  return (
    <BranchRail
      title="Featured"
      subtitle="Hand-picked for you"
      icon="sparkles"
      tone="accent"
      branches={q.data ?? []}
      loading={q.isLoading}
      point={point}
    />
  );
}

export function RecentRail() {
  const branches = useRecentBranches(10);
  return (
    <BranchRail
      title="Recently visited"
      subtitle="Jump back in"
      icon="clock"
      tone="info"
      branches={branches}
      seeAllHref="/favorites"
    />
  );
}

export function FavoritesRail() {
  const branches = useFavoriteBranches();
  const caps = useCapabilities();
  return (
    <BranchRail
      title="Repeat your favorites"
      subtitle="The ones you love"
      icon="heart"
      tone="danger"
      branches={branches}
      seeAllHref="/favorites"
      layout={caps.formFactor === 'handset' ? 'compact' : 'carousel'}
    />
  );
}

/** Promotions placeholder — the future Promotions module plugs in here. */
export function PromotionsRail() {
  return null;
}
