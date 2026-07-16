import { useNavigate } from 'react-router-dom';

import { getActiveBranchSlug } from '@/features/discovery';
import { CartView } from '../cart';
import { OrderingHeader } from './OrderingHeader';

/** /cart — the full cart (guest-session cart; one per session). */
export function CartPage() {
  const navigate = useNavigate();
  const branchSlug = getActiveBranchSlug() ?? '';
  const menuHref = branchSlug ? `/r/${branchSlug}/menu` : '/discover';

  return (
    <div>
      <OrderingHeader title="Your cart" />
      <CartView
        branchSlug={branchSlug}
        onCheckout={() => navigate('/checkout')}
        onBrowse={() => navigate(menuHref)}
        onEditItem={() => navigate(menuHref)}
      />
    </div>
  );
}
