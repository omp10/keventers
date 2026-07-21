import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CheckoutView } from '../checkout';
import type { Order } from '../types';
import { OrderingHeader } from './OrderingHeader';

/** /checkout — order summary + payment method; places the order, then collects
 *  payment inline for online orders. */
export function CheckoutPage() {
  const navigate = useNavigate();
  // Set once an online order is placed and we're on the inline payment step.
  // The cart is now a placed order, so "back" must go to THAT order — not to
  // the emptied cart, which is the whole bug this guards against.
  const [payOrder, setPayOrder] = useState<Order | null>(null);

  return (
    <div>
      <OrderingHeader
        title={payOrder ? 'Payment' : 'Checkout'}
        onBack={payOrder ? () => navigate(`/order/${payOrder.id}`, { replace: true }) : undefined}
      />
      <CheckoutView
        onPaymentStep={setPayOrder}
        onPlaced={(order, provider, method) =>
          navigate(`/order/${order.id}?provider=${provider}${method ? `&method=${method}` : ''}`, { replace: true })
        }
      />
    </div>
  );
}
