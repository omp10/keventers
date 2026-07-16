import { useNavigate } from 'react-router-dom';

import { getActiveBranchSlug } from '@/features/discovery';
import { CheckoutView } from '../checkout';
import { OrderingHeader } from './OrderingHeader';

/** /checkout — order summary + payment method; places the order. */
export function CheckoutPage() {
  const navigate = useNavigate();
  const branchSlug = getActiveBranchSlug() ?? '';

  return (
    <div>
      <OrderingHeader title="Checkout" />
      <CheckoutView
        branchSlug={branchSlug}
        onPlaced={(order, provider) => navigate(`/order/${order.id}?provider=${provider}`, { replace: true })}
      />
    </div>
  );
}
