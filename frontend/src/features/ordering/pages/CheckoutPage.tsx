import { useNavigate } from 'react-router-dom';

import { CheckoutView } from '../checkout';
import { OrderingHeader } from './OrderingHeader';

/** /checkout — order summary + payment method; places the order. */
export function CheckoutPage() {
  const navigate = useNavigate();
  return (
    <div>
      <OrderingHeader title="Checkout" />
      <CheckoutView
        onPlaced={(order, provider) => navigate(`/order/${order.id}?provider=${provider}`, { replace: true })}
      />
    </div>
  );
}
