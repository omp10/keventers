import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { getActiveBranchSlug } from '@/features/discovery';
import { JOURNEY, useJourney } from '@/platform/analytics';
import { CartView } from '../cart';
import { OrderingHeader } from './OrderingHeader';

/** /cart — the full cart (guest-session cart; one per session). */
export function CartPage() {
  const navigate = useNavigate();
  const journey = useJourney();
  const branchSlug = getActiveBranchSlug() ?? '';
  const menuHref = branchSlug ? `/r/${branchSlug}/menu` : '/discover';

  useEffect(() => {
    journey(JOURNEY.CART_VIEWED);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <OrderingHeader title="Your cart" />
      <CartView
        onCheckout={() => navigate('/checkout')}
        onBrowse={() => navigate(menuHref)}
        onEditItem={() => navigate(menuHref)}
      />
    </div>
  );
}
