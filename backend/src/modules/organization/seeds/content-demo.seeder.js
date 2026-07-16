import { logger as baseLogger } from '#core/logging/logger.js';
import { BaseSeeder } from '#database/seeds/base.seeder.js';

import { CATEGORY_STATUS, StorefrontCategory } from '../models/category.model.js';
import { ZONE_STATUS, ZONE_TYPE } from '../models/zone.model.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { zoneRepository } from '../repositories/zone.repository.js';

const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=300&q=70`;

/**
 * Storefront browse categories — the circular tiles on the customer home.
 * Admin-managed from /admin/categories; these are the starting set.
 */
const CATEGORIES = [
  { name: 'Milkshakes', icon: 'utensils', imageUrl: IMG('photo-1572490122747-3968b75cc699'), sortOrder: 1 },
  { name: 'Desserts', icon: 'utensils', imageUrl: IMG('photo-1551024506-0bccd828d307'), sortOrder: 2 },
  { name: 'Ice Cream', icon: 'utensils', imageUrl: IMG('photo-1497034825429-c343d7c6a68f'), sortOrder: 3 },
  { name: 'Waffles', icon: 'utensils', imageUrl: IMG('photo-1562376552-0d160a2f238d'), sortOrder: 4 },
  { name: 'Beverages', icon: 'utensils', imageUrl: IMG('photo-1544145945-f90425340c7e'), sortOrder: 5 },
  { name: 'Thick Shakes', icon: 'flame', imageUrl: IMG('photo-1626803775151-61d756612f97'), sortOrder: 6 },
];

/** Operating zones — delivery/service coverage circles across Delhi NCR. */
const ZONES = [
  { name: 'Central Delhi', code: 'CD', city: 'New Delhi', center: { lat: 28.6315, lng: 77.2167 }, radiusKm: 6, etaMinutes: 30, deliveryFee: 29, minOrderAmount: 199, sortOrder: 1 },
  { name: 'South Delhi', code: 'SD', city: 'New Delhi', center: { lat: 28.5355, lng: 77.221 }, radiusKm: 8, etaMinutes: 35, deliveryFee: 29, minOrderAmount: 199, sortOrder: 2 },
  { name: 'North Delhi', code: 'ND', city: 'New Delhi', center: { lat: 28.68, lng: 77.2069 }, radiusKm: 5, etaMinutes: 35, deliveryFee: 39, minOrderAmount: 249, sortOrder: 3 },
  { name: 'West Delhi', code: 'WD', city: 'New Delhi', center: { lat: 28.6425, lng: 77.1225 }, radiusKm: 6, etaMinutes: 40, deliveryFee: 39, minOrderAmount: 249, sortOrder: 4 },
  { name: 'Gurugram', code: 'GGN', city: 'Gurugram', center: { lat: 28.4595, lng: 77.0266 }, radiusKm: 10, etaMinutes: 40, deliveryFee: 49, minOrderAmount: 299, sortOrder: 5 },
  { name: 'Noida', code: 'NOI', city: 'Noida', center: { lat: 28.5355, lng: 77.391 }, radiusKm: 9, etaMinutes: 45, deliveryFee: 49, minOrderAmount: 299, sortOrder: 6, status: ZONE_STATUS.PAUSED },
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Seeds the ADMIN-MANAGED storefront content: browse categories (with tile
 * artwork) and operating zones. Idempotent — existing slugs/codes are skipped —
 * so admins' later edits are never overwritten by a re-run.
 */
export class ContentDemoSeeder extends BaseSeeder {
  constructor({ categories = categoryRepository, zones = zoneRepository, logger } = {}) {
    super();
    // v2: storefront categories moved to their own `storefrontcategories`
    // collection (they previously collided with the catalog's `Category` model,
    // which shares the name and therefore the `categories` collection). The
    // bumped name re-runs this seeder against the correct collection.
    this.name = '015-content-demo-v2';
    this.categories = categories;
    this.zones = zones;
    this.logger = logger ?? baseLogger({ module: 'organization', component: 'content-demo-seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = { categories: { created: 0, skipped: 0 }, zones: { created: 0, skipped: 0 }, legacyRemoved: 0 };

    // One-off cleanup: the v1 seeder wrote these tiles into the catalog's
    // `categories` collection via the model-name collision. They are ours (a
    // catalog category always carries a restaurantId), so remove only those.
    summary.legacyRemoved = await this.#removeLegacyCategories();

    for (const c of CATEGORIES) {
      const slug = slugify(c.name);
      if (await this.categories.findOne({ slug })) {
        summary.categories.skipped += 1;
        continue;
      }
      await this.categories.create({
        ...c,
        slug,
        searchTerm: c.name,
        featured: true,
        status: CATEGORY_STATUS.ACTIVE,
      });
      summary.categories.created += 1;
    }

    for (const z of ZONES) {
      if (await this.zones.findOne({ code: z.code })) {
        summary.zones.skipped += 1;
        continue;
      }
      await this.zones.create({
        ...z,
        type: ZONE_TYPE.DELIVERY,
        status: z.status ?? ZONE_STATUS.ACTIVE,
        center: { type: 'Point', coordinates: [z.center.lng, z.center.lat] },
      });
      summary.zones.created += 1;
    }

    this.logger.info({ summary }, 'Content demo seed complete');
    return summary;
  }

  /**
   * Delete the storefront tiles the v1 seeder mis-wrote into the catalog's
   * `categories` collection. Scoped tightly: matches only our exact slugs AND
   * requires `restaurantId` to be absent, which no real catalog category is.
   */
  async #removeLegacyCategories() {
    const collection = StorefrontCategory.db.collection('categories');
    const slugs = CATEGORIES.map((c) => slugify(c.name));
    const { deletedCount } = await collection.deleteMany({
      slug: { $in: slugs },
      restaurantId: { $exists: false },
    });
    if (deletedCount) this.logger.info({ deletedCount }, 'Removed legacy storefront categories from catalog collection');
    return deletedCount ?? 0;
  }

  async rollback(context = {}) {
    if (context.logger) this.logger = context.logger;
    for (const c of CATEGORIES) {
      const doc = await this.categories.findOne({ slug: slugify(c.name) });
      if (doc) await this.categories.deleteById(doc.id);
    }
    for (const z of ZONES) {
      const doc = await this.zones.findOne({ code: z.code });
      if (doc) await this.zones.deleteById(doc.id);
    }
    this.logger.info('Content demo seed rolled back');
  }
}

export const contentDemoSeeder = new ContentDemoSeeder();
export default contentDemoSeeder;
