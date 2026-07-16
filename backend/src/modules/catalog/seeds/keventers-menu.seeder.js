import { logger as baseLogger } from '#core/logging/logger.js';
import { BaseSeeder } from '#database/seeds/base.seeder.js';

import { CATEGORY_STATUS, ENTITY_STATUS, MENU_TYPE, PRODUCT_STATUS } from '../constants/catalog.constants.js';
import { Category } from '../models/category.model.js';
import { Menu } from '../models/menu.model.js';
import { Modifier } from '../models/modifier.model.js';
import { ModifierGroup } from '../models/modifier-group.model.js';
import { Product } from '../models/product.model.js';
import { Variant } from '../models/variant.model.js';

const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

/**
 * The Keventers menu, as customers see it: MAIN categories, each with
 * SUBCATEGORIES, each holding products. Prices are plain numbers in the
 * restaurant's currency (the catalog's convention).
 */
const MENU = [
  {
    name: 'Milkshakes',
    image: IMG('photo-1572490122747-3968b75cc699'),
    subs: [
      {
        name: 'Classic Shakes',
        products: [
          { name: 'Classic Belgian Chocolate', price: 249, compareAt: 299, popular: true, featured: true, image: IMG('photo-1572490122747-3968b75cc699'), desc: 'Rich Belgian chocolate blended thick and cold.' },
          { name: 'Alphonso Mango', price: 259, popular: true, image: IMG('photo-1553530666-ba11a7da3888'), desc: 'Seasonal Alphonso mangoes, nothing else.' },
          { name: 'Strawberry Swirl', price: 229, image: IMG('photo-1553787499-6f9133860278'), desc: 'Fresh strawberries with a cream swirl.' },
          { name: 'Vanilla Bean', price: 219, image: IMG('photo-1568901346375-23c9450c58cd'), desc: 'Madagascar vanilla, simple and perfect.' },
        ],
      },
      {
        name: 'Thick Shakes',
        products: [
          { name: 'Oreo Delight', price: 239, popular: true, recommended: true, image: IMG('photo-1563805042-7684c019e1cb'), desc: 'Crushed Oreo cookies in a thick shake.' },
          { name: 'Nutella Overload', price: 289, recommended: true, image: IMG('photo-1541658016709-82535e94bc69'), desc: 'A generous scoop of Nutella, blended thick.' },
          { name: 'Cold Coffee Classic', price: 199, popular: true, image: IMG('photo-1461023058943-07fcbe16d735'), desc: 'Our signature cold coffee.' },
        ],
      },
    ],
  },
  {
    name: 'Desserts',
    image: IMG('photo-1551024506-0bccd828d307'),
    subs: [
      {
        name: 'Ice Cream',
        products: [
          { name: 'Belgian Chocolate Scoop', price: 149, image: IMG('photo-1497034825429-c343d7c6a68f'), desc: 'Two scoops of dark Belgian chocolate.' },
          { name: 'Vanilla Scoop', price: 129, image: IMG('photo-1567206563064-6f60f40a2b57'), desc: 'Classic vanilla bean.' },
        ],
      },
      {
        name: 'Waffles',
        products: [
          { name: 'Chocolate Waffle', price: 229, recommended: true, image: IMG('photo-1562376552-0d160a2f238d'), desc: 'Crisp waffle, molten chocolate.' },
          { name: 'Maple Butter Waffle', price: 209, image: IMG('photo-1598233847491-f16487adee2f'), desc: 'Maple syrup and salted butter.' },
        ],
      },
    ],
  },
  {
    name: 'Beverages',
    image: IMG('photo-1544145945-f90425340c7e'),
    subs: [
      {
        name: 'Hot Drinks',
        products: [
          { name: 'Cappuccino', price: 159, image: IMG('photo-1572442388796-11668a67e53d'), desc: 'Double shot with steamed milk.' },
          { name: 'Hot Chocolate', price: 179, image: IMG('photo-1542990253-0d0f5be5f0ed'), desc: 'Belgian chocolate, steamed milk.' },
        ],
      },
    ],
  },
];

/** Size options — attached to every shake so variants are exercised end-to-end. */
const SIZE_VARIANTS = [
  { name: 'Regular', priceDelta: 0, isDefault: true },
  { name: 'Large', priceDelta: 60 },
];

/** A reusable modifier group, exactly as a real menu would share one. */
const TOPPINGS = {
  name: 'Add Toppings',
  isRequired: false,
  minSelection: 0,
  maxSelection: 3,
  modifiers: [
    { name: 'Whipped Cream', price: 30 },
    { name: 'Chocolate Chips', price: 40 },
    { name: 'Caramel Drizzle', price: 35 },
    { name: 'Extra Ice Cream Scoop', price: 60 },
  ],
};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Seeds the Keventers restaurant's real menu so the customer ordering flow has
 * something to order: one menu → 3 main categories → 6 subcategories → 13
 * products, with size variants and a shared toppings modifier group.
 *
 * Idempotent by slug, and a no-op when the Keventers restaurant is absent, so
 * it's safe on any installation.
 */
export class KeventersMenuSeeder extends BaseSeeder {
  constructor({ logger } = {}) {
    super();
    this.name = '016-keventers-menu';
    this.logger = logger ?? baseLogger({ module: 'catalog', component: 'keventers-menu-seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = { categories: 0, products: 0, variants: 0, modifiers: 0, skipped: false };

    // Resolve the tenant lazily — the organization module owns restaurants.
    const { Restaurant } = await import('#modules/organization/models/restaurant.model.js');
    const restaurant = await Restaurant.findOne({ slug: 'keventers' }).lean();
    if (!restaurant) {
      this.logger.warn('Keventers restaurant not found — skipping menu seed');
      return { ...summary, skipped: true };
    }

    const tenant = { organizationId: restaurant.organizationId, restaurantId: restaurant._id };

    const menu = await this.#upsertMenu(tenant);
    const toppings = await this.#upsertToppings(tenant, summary);

    let categoryOrder = 0;
    for (const main of MENU) {
      const mainCategory = await this.#upsertCategory(tenant, {
        menuId: menu._id,
        name: main.name,
        imageUrl: main.image,
        parentId: null,
        depth: 0,
        displayOrder: categoryOrder++,
      });
      summary.categories += 1;

      let subOrder = 0;
      for (const sub of main.subs) {
        const subCategory = await this.#upsertCategory(tenant, {
          menuId: menu._id,
          name: sub.name,
          parentId: mainCategory._id,
          depth: 1,
          displayOrder: subOrder++,
        });
        summary.categories += 1;

        let productOrder = 0;
        for (const p of sub.products) {
          const product = await this.#upsertProduct(tenant, {
            menu,
            category: subCategory,
            rootCategory: mainCategory,
            toppingsGroupId: toppings._id,
            spec: p,
            displayOrder: productOrder++,
          });
          summary.products += 1;
          summary.variants += await this.#upsertVariants(tenant, product, p.price);
        }
      }
    }

    this.logger.info({ summary }, 'Keventers menu seed complete');
    return summary;
  }

  async #upsertMenu(tenant) {
    const slug = 'keventers-all-day';
    const existing = await Menu.findOne({ restaurantId: tenant.restaurantId, slug });
    if (existing) return existing;
    return Menu.create({
      ...tenant,
      name: 'All Day Menu',
      slug,
      description: 'Shakes, desserts and coffee — served all day.',
      type: MENU_TYPE.REGULAR,
      status: ENTITY_STATUS.ACTIVE,
      isDefault: true,
    });
  }

  async #upsertToppings(tenant, summary) {
    let group = await ModifierGroup.findOne({ restaurantId: tenant.restaurantId, name: TOPPINGS.name });
    if (!group) {
      group = await ModifierGroup.create({
        ...tenant,
        name: TOPPINGS.name,
        isRequired: TOPPINGS.isRequired,
        minSelection: TOPPINGS.minSelection,
        maxSelection: TOPPINGS.maxSelection,
        status: ENTITY_STATUS.ACTIVE,
      });
    }
    for (const [i, m] of TOPPINGS.modifiers.entries()) {
      const exists = await Modifier.findOne({ groupId: group._id, name: m.name });
      if (exists) continue;
      await Modifier.create({
        ...tenant,
        groupId: group._id,
        name: m.name,
        price: m.price,
        displayOrder: i,
        status: ENTITY_STATUS.ACTIVE,
      });
      summary.modifiers += 1;
    }
    return group;
  }

  async #upsertCategory(tenant, { menuId, name, imageUrl = null, parentId, depth, displayOrder }) {
    const slug = slugify(name);
    const existing = await Category.findOne({ restaurantId: tenant.restaurantId, slug });
    if (existing) return existing;
    return Category.create({
      ...tenant,
      menuId,
      parentId,
      depth,
      name,
      slug,
      imageUrl,
      displayOrder,
      status: CATEGORY_STATUS.ACTIVE,
    });
  }

  async #upsertProduct(tenant, { menu, category, rootCategory, toppingsGroupId, spec, displayOrder }) {
    const slug = slugify(spec.name);
    const existing = await Product.findOne({ restaurantId: tenant.restaurantId, slug });
    if (existing) return existing;
    return Product.create({
      ...tenant,
      categoryId: category._id,
      rootCategoryId: rootCategory._id,
      menuIds: [menu._id],
      name: spec.name,
      slug,
      description: spec.desc ?? '',
      images: spec.image ? [{ url: spec.image, alt: spec.name }] : [],
      heroImageUrl: spec.image ?? null,
      thumbnailUrl: spec.image ?? null,
      pricing: { basePrice: spec.price, compareAtPrice: spec.compareAt ?? null },
      preparationTimeMinutes: 6,
      dietaryTags: ['vegetarian'],
      modifierGroupIds: [toppingsGroupId],
      isFeatured: Boolean(spec.featured),
      isPopular: Boolean(spec.popular),
      isRecommended: Boolean(spec.recommended),
      displayOrder,
      status: PRODUCT_STATUS.ACTIVE,
    });
  }

  async #upsertVariants(tenant, product, basePrice) {
    let created = 0;
    for (const [i, v] of SIZE_VARIANTS.entries()) {
      const exists = await Variant.findOne({ productId: product._id, name: v.name });
      if (exists) continue;
      await Variant.create({
        ...tenant,
        productId: product._id,
        name: v.name,
        price: basePrice + v.priceDelta,
        isDefault: Boolean(v.isDefault),
        displayOrder: i,
        status: ENTITY_STATUS.ACTIVE,
      });
      created += 1;
    }
    return created;
  }
}

export const keventersMenuSeeder = new KeventersMenuSeeder();
export default keventersMenuSeeder;
