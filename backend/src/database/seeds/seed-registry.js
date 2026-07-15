import { catalogSeeder } from '#modules/catalog/seeds/catalog.seeder.js';
import { identitySeeder } from '#modules/identity/seeds/index.js';
import { kitchenSeeder } from '#modules/kitchen/seeds/kitchen.seeder.js';
import { orderSeeder } from '#modules/order/seeds/order.seeder.js';
import { customerSeeder } from '#modules/customer/seeds/customer.seeder.js';
import { analyticsSeeder } from '#modules/analytics/seeds/analytics.seeder.js';
import { notificationSeeder } from '#modules/notification/seeds/notification.seeder.js';
import { paymentSeeder } from '#modules/payment/seeds/payment.seeder.js';
import { organizationSeeder } from '#modules/organization/seeds/organization.seeder.js';
import { pricingSeeder } from '#modules/pricing/seeds/pricing.seeder.js';
import { qrSeeder } from '#modules/qr-ordering/seeds/qr.seeder.js';

/**
 * Ordered registry of seeder instances, applied by the SeedRunner in order and
 * tracked in the `_seeds` ledger so each runs exactly once per installation.
 *
 * Add new modules' seeders here (keep deterministic order). Version a seeder by
 * bumping its `name` (e.g. `002-...`) so a migration re-runs as a new entry.
 *
 * @type {import('./base.seeder.js').BaseSeeder[]}
 */
export const seedRegistry = [
  identitySeeder,
  organizationSeeder,
  catalogSeeder,
  qrSeeder,
  pricingSeeder,
  orderSeeder,
  kitchenSeeder,
  paymentSeeder,
  customerSeeder,
  notificationSeeder,
  analyticsSeeder,
];

export default seedRegistry;
