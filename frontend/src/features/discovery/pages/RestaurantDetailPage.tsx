import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ErrorState, Icon } from '@/design-system';
import { useDiscoveryOrigin } from '../location';
import { useBranchDetail } from '../hooks';
import { branchCollections } from '../favorites';
import { setActiveBranchSlug } from '../entry';
import { RestaurantDetail, RestaurantDetailSkeleton } from '../restaurant-detail';
import type { BranchDetail } from '../types';

/** /r/:branchSlug — branch detail. Records the visit; Order Now enters F3.2. */
export function RestaurantDetailPage() {
  const { branchSlug } = useParams<{ branchSlug: string }>();
  const navigate = useNavigate();
  const origin = useDiscoveryOrigin();
  const query = useBranchDetail(branchSlug, origin.point);

  const branch = query.data;
  useEffect(() => {
    if (branch) branchCollections.recordVisit(branch);
  }, [branch]);

  if (query.isLoading) return <RestaurantDetailSkeleton />;

  if (query.isError || !branch) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6">
        <ErrorState
          title="Restaurant not found"
          description="This place may have moved or the link is invalid."
          action={<button className="text-primary hover:underline" onClick={() => navigate('/discover')}>Browse restaurants</button>}
        />
      </div>
    );
  }

  const onOrderNow = (b: BranchDetail) => {
    // Phase F3.2 — open the branch menu to start ordering.
    setActiveBranchSlug(b.slug);
    navigate(`/r/${b.slug}/menu`);
  };

  return (
    <div className="-mx-4 -my-5">
      <button onClick={() => navigate(-1)} aria-label="Back" className="absolute left-4 top-4 z-30 grid h-9 w-9 place-items-center rounded-full bg-surface/80 text-foreground shadow backdrop-blur">
        <Icon name="arrowLeft" className="h-5 w-5" />
      </button>
      <RestaurantDetail branch={branch} onOrderNow={onOrderNow} />
    </div>
  );
}
