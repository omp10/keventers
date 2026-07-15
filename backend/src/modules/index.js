import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';

import { cartModule } from './cart/cart.module.js';
import { catalogModule } from './catalog/catalog.module.js';
import { identityModule } from './identity/identity.module.js';
import { kitchenModule } from './kitchen/kitchen.module.js';
import { orderModule } from './order/order.module.js';
import { analyticsModule } from './analytics/analytics.module.js';
import { customerModule } from './customer/customer.module.js';
import { notificationModule } from './notification/notification.module.js';
import { paymentModule } from './payment/payment.module.js';
import { organizationModule } from './organization/organization.module.js';
import { pricingModule } from './pricing/pricing.module.js';
import { qrOrderingModule } from './qr-ordering/qr-ordering.module.js';

/**
 * Registered business modules, in mount order. Identity is registered first so
 * its specific `/identity` mount is matched first. Catalog, QR-ordering, pricing
 * and cart are registered BEFORE organization so their exact sub-paths
 * (`/restaurant/menus`, `/restaurant/tables`, `/restaurant/coupons`,
 * `/public/qr`, `/cart`, `/admin/catalog`, …) win, while every other
 * `/restaurant/*`, `/admin/*` and `/public` request falls through to the
 * organization module's broad root-level ('/') sub-routers. Pricing precedes
 * cart because the cart composes the Pricing Engine at load.
 */
export const modules = [
  identityModule,
  catalogModule,
  qrOrderingModule,
  pricingModule,
  cartModule,
  orderModule,
  kitchenModule,
  paymentModule,
  customerModule,
  notificationModule,
  analyticsModule,
  organizationModule,
];

/**
 * Register every module (DI providers, RBAC seed, event handlers).
 * @param {{ container?: object, eventBus?: object }} [deps]
 */
export function registerModules({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
  for (const module of modules) {
    module.register({ container, eventBus });
  }
  return modules;
}

export {
  identityModule,
  catalogModule,
  qrOrderingModule,
  pricingModule,
  cartModule,
  orderModule,
  kitchenModule,
  paymentModule,
  customerModule,
  notificationModule,
  analyticsModule,
  organizationModule,
};
