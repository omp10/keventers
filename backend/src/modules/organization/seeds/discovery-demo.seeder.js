import { logger as baseLogger } from '#core/logging/logger.js';
import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { USER_STATUS, USER_TYPE } from '#modules/identity/constants/identity.constants.js';
import { userRepository } from '#modules/identity/repositories/user.repository.js';
import { passwordService } from '#platform/auth/index.js';

import {
  BRANCH_STATUS,
  MEMBERSHIP_SCOPE,
  MEMBERSHIP_STATUS,
  ORGANIZATION_STATUS,
  ORG_ROLES,
  RESTAURANT_STATUS,
  RESTAURANT_TYPE,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
} from '../constants/organization.constants.js';
import { BANNER_PLACEMENT, BANNER_STATUS, BANNER_THEME } from '../models/banner.model.js';
import { bannerRepository } from '../repositories/banner.repository.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { membershipRepository } from '../repositories/membership.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { restaurantRepository } from '../repositories/restaurant.repository.js';

const OWNER = {
  email: 'owner+keventers@keventers.demo',
  phone: '+919800000100',
  firstName: 'Keventers',
  lastName: 'Demo',
  password: 'DemoOwner123!',
};

const ORG = {
  slug: 'keventers-india',
  name: 'Keventers India',
  brandName: 'Keventers',
};

const RESTAURANT = {
  slug: 'keventers',
  name: 'Keventers',
  type: RESTAURANT_TYPE.QSR,
  cuisines: ['Milkshakes', 'Desserts', 'Ice Cream', 'Beverages', 'Waffles'],
  logoUrl: '/brand/keventers/logo.png',
};

const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

/**
 * Demo "kitchens" — customer-discoverable Keventers outlets across Delhi NCR
 * with real coordinates, ratings, offers and cover imagery so the customer
 * homepage (nearby / trending / featured rails, search, branch pages) is fully
 * alive out of the box.
 */
const KITCHENS = [
  {
    name: 'Keventers Connaught Place',
    code: 'KV-CP-01',
    slug: 'keventers-connaught-place',
    area: 'Connaught Place',
    city: 'New Delhi',
    lat: 28.6315,
    lng: 77.2167,
    rating: 4.7,
    ratingCount: 2841,
    prepTimeMinutes: 8,
    popularityScore: 98,
    featured: true,
    offer: { label: '20% off on classic shakes', description: 'Weekdays 2–5 pm' },
    cover: IMG('photo-1572490122747-3968b75cc699'),
    delivery: true,
  },
  {
    name: 'Keventers Khan Market',
    code: 'KV-KM-01',
    slug: 'keventers-khan-market',
    area: 'Khan Market',
    city: 'New Delhi',
    lat: 28.6003,
    lng: 77.227,
    rating: 4.6,
    ratingCount: 1932,
    prepTimeMinutes: 10,
    popularityScore: 91,
    featured: true,
    cover: IMG('photo-1577805947697-89e18249d767'),
    delivery: true,
  },
  {
    name: 'Keventers Hauz Khas',
    code: 'KV-HK-01',
    slug: 'keventers-hauz-khas',
    area: 'Hauz Khas Village',
    city: 'New Delhi',
    lat: 28.5535,
    lng: 77.1942,
    rating: 4.5,
    ratingCount: 1418,
    prepTimeMinutes: 12,
    popularityScore: 84,
    promoted: true,
    offer: { label: 'Buy 1 Get 1 on sundaes', description: 'Late-night special after 10 pm' },
    cover: IMG('photo-1541658016709-82535e94bc69'),
    delivery: true,
    lateNight: true,
  },
  {
    name: 'Keventers Kamla Nagar',
    code: 'KV-KN-01',
    slug: 'keventers-kamla-nagar',
    area: 'Kamla Nagar',
    city: 'New Delhi',
    lat: 28.68,
    lng: 77.2069,
    rating: 4.3,
    ratingCount: 987,
    prepTimeMinutes: 9,
    popularityScore: 72,
    cover: IMG('photo-1560008581-09826d1de69e'),
    delivery: false,
  },
  {
    name: 'Keventers Select Citywalk',
    code: 'KV-SK-01',
    slug: 'keventers-select-citywalk',
    area: 'Saket',
    city: 'New Delhi',
    lat: 28.5286,
    lng: 77.2192,
    rating: 4.6,
    ratingCount: 2210,
    prepTimeMinutes: 8,
    popularityScore: 89,
    featured: true,
    cover: IMG('photo-1553787499-6f9133860278'),
    delivery: true,
  },
  {
    name: 'Keventers CyberHub',
    code: 'KV-CH-01',
    slug: 'keventers-cyberhub',
    area: 'DLF CyberHub',
    city: 'Gurugram',
    lat: 28.495,
    lng: 77.089,
    rating: 4.4,
    ratingCount: 1655,
    prepTimeMinutes: 11,
    popularityScore: 80,
    offer: { label: 'Free waffle with thick shakes', description: 'On orders above ₹499' },
    cover: IMG('photo-1600718374662-0483d2b9da44'),
    delivery: true,
  },
  {
    name: 'Keventers Sector 18',
    code: 'KV-N18-01',
    slug: 'keventers-noida-18',
    area: 'Sector 18',
    city: 'Noida',
    lat: 28.5708,
    lng: 77.3261,
    rating: 4.2,
    ratingCount: 743,
    prepTimeMinutes: 12,
    popularityScore: 64,
    cover: IMG('photo-1579954115545-a95591f28bfc'),
    delivery: true,
  },
  {
    name: 'Keventers Rajouri Garden',
    code: 'KV-RG-01',
    slug: 'keventers-rajouri-garden',
    area: 'Rajouri Garden',
    city: 'New Delhi',
    lat: 28.6425,
    lng: 77.1225,
    rating: 4.4,
    ratingCount: 1102,
    prepTimeMinutes: 10,
    popularityScore: 70,
    promoted: true,
    cover: IMG('photo-1626803775151-61d756612f97'),
    delivery: true,
  },
];

/** Admin-curated homepage banners (the customer carousel renders these). */
const BANNERS = [
  {
    placement: BANNER_PLACEMENT.CUSTOMER_HOME,
    title: 'Flat 20% off your first order',
    subtitle: 'Use code WELCOME20 at checkout',
    theme: BANNER_THEME.BRAND,
    cta: { label: 'Order now', href: '/discover' },
    sortOrder: 1,
    status: BANNER_STATUS.ACTIVE,
  },
  {
    placement: BANNER_PLACEMENT.CUSTOMER_HOME,
    title: 'Summer Shake Fest is here',
    subtitle: 'Seasonal specials across all kitchens',
    theme: BANNER_THEME.IMAGE,
    imageUrl: IMG('photo-1572490122747-3968b75cc699'),
    cta: { label: 'Explore specials', href: '/discover' },
    branchSlug: 'keventers-connaught-place',
    sortOrder: 2,
    status: BANNER_STATUS.ACTIVE,
  },
  {
    placement: BANNER_PLACEMENT.CUSTOMER_HOME,
    title: 'Earn rewards on every sip',
    subtitle: 'Collect points automatically, redeem at checkout',
    theme: BANNER_THEME.ACCENT,
    cta: { label: 'View rewards', href: '/loyalty' },
    sortOrder: 3,
    status: BANNER_STATUS.ACTIVE,
  },
];

const hours = ({ lateNight = false } = {}) =>
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => ({
    day,
    isOpen: true,
    open: '10:00',
    close: lateNight ? '01:00' : day === 'friday' || day === 'saturday' ? '23:30' : '23:00',
  }));

const services = ({ delivery }) => [
  { mode: 'dine_in', available: true },
  { mode: 'takeaway', available: true, etaMinutes: 10 },
  { mode: 'delivery', available: Boolean(delivery), etaMinutes: delivery ? 30 : null },
];

/**
 * Seeds the CUSTOMER-FACING discovery catalog: the Keventers organization, its
 * flagship restaurant, eight discoverable kitchens (slug + geo + imagery +
 * ratings + offers) and the admin-managed homepage banners. Idempotent —
 * existing slugs/codes are skipped.
 */
export class DiscoveryDemoSeeder extends BaseSeeder {
  constructor({
    organizations = organizationRepository,
    restaurants = restaurantRepository,
    branches = branchRepository,
    banners = bannerRepository,
    memberships = membershipRepository,
    users = userRepository,
    passwords = passwordService,
    logger,
  } = {}) {
    super();
    this.name = '013-discovery-demo';
    this.organizations = organizations;
    this.restaurants = restaurants;
    this.branches = branches;
    this.banners = banners;
    this.memberships = memberships;
    this.users = users;
    this.passwords = passwords;
    this.logger = logger ?? baseLogger({ module: 'organization', component: 'discovery-demo-seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = {
      organizations: { created: 0, skipped: 0 },
      restaurants: { created: 0, skipped: 0 },
      branches: { created: 0, skipped: 0 },
      banners: { created: 0, skipped: 0 },
    };

    const owner = await this.#owner();
    const organization = await this.#organization(summary, owner);
    const restaurant = await this.#restaurant(summary, organization, owner);
    await this.#kitchens(summary, organization, restaurant, owner);
    await this.#banners(summary, owner);

    this.logger.info({ summary }, 'Discovery demo seed complete');
    return summary;
  }

  async #owner() {
    let user = await this.users.findByEmail(OWNER.email);
    if (!user) {
      user = await this.users.create({
        email: OWNER.email,
        phone: OWNER.phone,
        passwordHash: await this.passwords.hash(OWNER.password),
        firstName: OWNER.firstName,
        lastName: OWNER.lastName,
        type: USER_TYPE.STAFF,
        status: USER_STATUS.ACTIVE,
        emailVerified: true,
        roles: [ORG_ROLES.ORGANIZATION_ADMIN],
        permissions: [],
      });
    }
    return user;
  }

  async #organization(summary, owner) {
    let organization = await this.organizations.findBySlug(ORG.slug);
    if (organization) {
      summary.organizations.skipped += 1;
      return organization;
    }
    organization = await this.organizations.create({
      name: ORG.name,
      slug: ORG.slug,
      brandName: ORG.brandName,
      ownerUserId: owner.id,
      status: ORGANIZATION_STATUS.ACTIVE,
      contact: { email: OWNER.email, phone: OWNER.phone },
      subscription: {
        plan: SUBSCRIPTION_PLAN.PRO,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        maxRestaurants: 5,
        maxBranches: 25,
      },
    });
    summary.organizations.created += 1;

    const membership = await this.memberships.findByUserAndOrg(owner.id, organization.id);
    if (!membership) {
      await this.memberships.create({
        userId: owner.id,
        organizationId: organization.id,
        scope: MEMBERSHIP_SCOPE.ORGANIZATION,
        role: ORG_ROLES.ORGANIZATION_ADMIN,
        isOwner: true,
        status: MEMBERSHIP_STATUS.ACTIVE,
      });
    }
    return organization;
  }

  async #restaurant(summary, organization, owner) {
    let restaurant = await this.restaurants.findOne({
      organizationId: organization.id,
      slug: RESTAURANT.slug,
    });
    if (restaurant) {
      summary.restaurants.skipped += 1;
      return restaurant;
    }
    restaurant = await this.restaurants.create({
      organizationId: organization.id,
      name: RESTAURANT.name,
      slug: RESTAURANT.slug,
      type: RESTAURANT.type,
      cuisines: RESTAURANT.cuisines,
      address: { line1: 'A-1 Connaught Place', city: 'New Delhi', state: 'Delhi', country: 'India', pincode: '110001' },
      status: RESTAURANT_STATUS.ACTIVE,
      managerUserId: owner.id,
      onboarding: { started: true, completed: true, completedAt: new Date('2026-07-01T00:00:00.000Z') },
      settings: {
        branding: { logoUrl: RESTAURANT.logoUrl },
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        contact: { email: OWNER.email, phone: OWNER.phone },
        delivery: { enabled: true, radiusKm: 8 },
        orderPreferences: { dineIn: true, takeaway: true, delivery: true },
      },
    });
    summary.restaurants.created += 1;
    return restaurant;
  }

  async #kitchens(summary, organization, restaurant, owner) {
    for (const k of KITCHENS) {
      const existing = await this.branches.findOne({ slug: k.slug });
      if (existing) {
        summary.branches.skipped += 1;
        continue;
      }
      await this.branches.create({
        organizationId: organization.id,
        restaurantId: restaurant.id,
        name: k.name,
        code: k.code,
        slug: k.slug,
        address: {
          line1: `${k.area}, ${k.city}`,
          line2: k.area,
          city: k.city,
          state: k.city === 'Gurugram' ? 'Haryana' : k.city === 'Noida' ? 'Uttar Pradesh' : 'Delhi',
          country: 'India',
          pincode: '110001',
        },
        location: { type: 'Point', coordinates: [k.lng, k.lat] },
        discovery: {
          coverImageUrl: k.cover,
          description: `Freshly shaken classics and seasonal specials at ${k.name}. Dine in, take away, or order straight from your table with a QR scan.`,
          area: k.area,
          rating: k.rating,
          ratingCount: k.ratingCount,
          prepTimeMinutes: k.prepTimeMinutes,
          featured: Boolean(k.featured),
          promoted: Boolean(k.promoted),
          offer: k.offer ?? null,
          popularityScore: k.popularityScore,
          services: services(k),
          amenities: ['QR table ordering', 'Card payments', 'Family friendly'],
        },
        businessHours: hours(k),
        managerUserId: owner.id,
        isPrimary: k.code === 'KV-CP-01',
        status: BRANCH_STATUS.ACTIVE,
        settings: { currency: 'INR', timezone: 'Asia/Kolkata', acceptsOnlineOrders: true, tableCount: 12 },
      });
      summary.branches.created += 1;
    }
  }

  async #banners(summary, owner) {
    for (const b of BANNERS) {
      const existing = await this.banners.findOne({ title: b.title, placement: b.placement });
      if (existing) {
        summary.banners.skipped += 1;
        continue;
      }
      await this.banners.create({ ...b, createdBy: owner.id });
      summary.banners.created += 1;
    }
  }

  async rollback(context = {}) {
    if (context.logger) this.logger = context.logger;

    for (const b of BANNERS) {
      const banner = await this.banners.findOne({ title: b.title, placement: b.placement });
      if (banner) await this.banners.deleteById(banner.id);
    }
    for (const k of KITCHENS) {
      const branch = await this.branches.findOne({ slug: k.slug });
      if (branch) await this.branches.deleteById(branch.id);
    }
    const organization = await this.organizations.findBySlug(ORG.slug);
    if (organization) {
      const restaurant = await this.restaurants.findOne({ organizationId: organization.id, slug: RESTAURANT.slug });
      if (restaurant) await this.restaurants.deleteById(restaurant.id);
      const memberships = await this.memberships.findByOrganization(organization.id);
      for (const membership of memberships) await this.memberships.deleteById(membership.id);
      await this.organizations.deleteById(organization.id);
    }
    const user = await this.users.findByEmail(OWNER.email);
    if (user) await this.users.deleteById(user.id);

    this.logger.info('Discovery demo seed rolled back');
  }
}

export const discoveryDemoSeeder = new DiscoveryDemoSeeder();
export default discoveryDemoSeeder;
