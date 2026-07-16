import { Link } from 'react-router-dom';

import { Icon, type IconName } from '@/design-system';
import { RestaurantCarousel } from '../components';
import { useFavoriteBranches, useRecentBranches } from '../favorites';
import { useFeaturedBranches, useNearbyBranches, usePopularBranches, usePrefetchBranch } from '../hooks';
import type { Branch, GeoPoint } from '../types';

function RailHeader({ title, icon, seeAllHref }: { title: string; icon: IconName; seeAllHref?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Icon name={icon} className="h-4 w-4 text-primary" />
        {title}
      </h2>
      {seeAllHref && (
        <Link to={seeAllHref} className="text-sm font-medium text-primary hover:underline">
          See all
        </Link>
      )}
    </div>
  );
}

/** Generic branch rail — a titled horizontal carousel. */
export function BranchRail({
  title,
  icon,
  branches,
  loading,
  seeAllHref,
  point,
}: {
  title: string;
  icon: IconName;
  branches: Branch[];
  loading?: boolean;
  seeAllHref?: string;
  point?: GeoPoint | null;
}) {
  const prefetch = usePrefetchBranch(point);
  if (!loading && branches.length === 0) return null;
  return (
    <section>
      <RailHeader title={title} icon={icon} seeAllHref={seeAllHref} />
      <RestaurantCarousel branches={branches} loading={loading} onPrefetch={prefetch} />
    </section>
  );
}

export function NearbyRail({ point }: { point: GeoPoint | null }) {
  const q = useNearbyBranches(point);
  const branches = (q.data?.pages.flatMap((p) => p.items) ?? []).slice(0, 10) as Branch[];
  if (!point) return null;
  return <BranchRail title="Nearby" icon="store" branches={branches} loading={q.isLoading} seeAllHref="/nearby" point={point} />;
}

export function PopularRail({ point }: { point: GeoPoint | null }) {
  const q = usePopularBranches(point);
  return <BranchRail title="Popular nearby" icon="trend" branches={q.data ?? []} loading={q.isLoading} seeAllHref="/discover" point={point} />;
}

export function FeaturedRail({ point }: { point: GeoPoint | null }) {
  const q = useFeaturedBranches(point);
  return <BranchRail title="Featured" icon="star" branches={q.data ?? []} loading={q.isLoading} point={point} />;
}

export function RecentRail() {
  const branches = useRecentBranches(10);
  return <BranchRail title="Recently visited" icon="clock" branches={branches} seeAllHref="/favorites" />;
}

export function FavoritesRail() {
  const branches = useFavoriteBranches();
  return <BranchRail title="Your favorites" icon="star" branches={branches} seeAllHref="/favorites" />;
}

/** Promotions placeholder — the future Promotions module plugs in here. */
export function PromotionsRail() {
  return null;
}
