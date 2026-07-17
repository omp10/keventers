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
import { Branch } from '../models/branch.model.js';
import { Membership } from '../models/membership.model.js';
import { Organization } from '../models/organization.model.js';
import { Restaurant } from '../models/restaurant.model.js';

import { logger as baseLogger } from '#core/logging/logger.js';
import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { CATEGORY_STATUS, MENU_STATUS, MENU_TYPE, PRODUCT_STATUS } from '#modules/catalog/constants/catalog.constants.js';
import { Category } from '#modules/catalog/models/category.model.js';
import { Menu } from '#modules/catalog/models/menu.model.js';
import { Product } from '#modules/catalog/models/product.model.js';
import { USER_STATUS, USER_TYPE } from '#modules/identity/constants/identity.constants.js';
import { userRepository } from '#modules/identity/repositories/user.repository.js';
import { passwordService } from '#platform/auth/index.js';

const DEMO_PASSWORD = 'DemoOwner123!';
const RESTAURANT_COUNT = 50;
const PRODUCTS_PER_RESTAURANT = 10;

const IMG = (id, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const CITY_FIXTURES = [
  { city: 'Delhi', state: 'Delhi', area: 'Connaught Place', pin: '110001', lng: 77.219, lat: 28.632 },
  { city: 'Gurugram', state: 'Haryana', area: 'CyberHub', pin: '122002', lng: 77.088, lat: 28.495 },
  { city: 'Noida', state: 'Uttar Pradesh', area: 'Sector 18', pin: '201301', lng: 77.326, lat: 28.57 },
  { city: 'Mumbai', state: 'Maharashtra', area: 'Bandra West', pin: '400050', lng: 72.829, lat: 19.06 },
  { city: 'Pune', state: 'Maharashtra', area: 'Koregaon Park', pin: '411001', lng: 73.897, lat: 18.536 },
  { city: 'Bengaluru', state: 'Karnataka', area: 'Indiranagar', pin: '560038', lng: 77.641, lat: 12.971 },
  { city: 'Hyderabad', state: 'Telangana', area: 'Banjara Hills', pin: '500034', lng: 78.448, lat: 17.412 },
  { city: 'Chennai', state: 'Tamil Nadu', area: 'Nungambakkam', pin: '600034', lng: 80.24, lat: 13.06 },
  { city: 'Kolkata', state: 'West Bengal', area: 'Park Street', pin: '700016', lng: 88.352, lat: 22.553 },
  { city: 'Ahmedabad', state: 'Gujarat', area: 'Prahlad Nagar', pin: '380015', lng: 72.507, lat: 23.012 },
  { city: 'Jaipur', state: 'Rajasthan', area: 'C Scheme', pin: '302001', lng: 75.806, lat: 26.912 },
  { city: 'Chandigarh', state: 'Chandigarh', area: 'Sector 17', pin: '160017', lng: 76.779, lat: 30.741 },
];

const PRODUCT_POOLS = {
  'North Indian': {
    categories: ['Starters', 'Curries', 'Breads', 'Rice & Biryani', 'Desserts'],
    cuisineTags: ['North Indian', 'Punjabi'],
    images: [
      IMG('photo-1585937421612-70a008356fbe'),
      IMG('photo-1601050690597-df0568f70950'),
      IMG('photo-1631452180519-c014fe946bc7'),
      IMG('photo-1596797038530-2c107229654b'),
    ],
    products: ['Paneer Tikka', 'Butter Chicken', 'Dal Makhani', 'Chole Kulche', 'Garlic Naan', 'Jeera Rice', 'Veg Biryani', 'Rajma Bowl', 'Tandoori Platter', 'Gulab Jamun'],
  },
  Italian: {
    categories: ['Pizza', 'Pasta', 'Small Plates', 'Salads', 'Desserts'],
    cuisineTags: ['Italian', 'Pizza'],
    images: [
      IMG('photo-1565299624946-b28f40a0ae38'),
      IMG('photo-1551183053-bf91a1d81141'),
      IMG('photo-1600891964599-f61ba0e24092'),
      IMG('photo-1481931098730-318b6f776db0'),
    ],
    products: ['Margherita Pizza', 'Pepperoni Pizza', 'Penne Arrabbiata', 'Alfredo Pasta', 'Pesto Spaghetti', 'Garlic Bread', 'Caprese Salad', 'Mushroom Risotto', 'Tiramisu Cup', 'Truffle Fries'],
  },
  Asian: {
    categories: ['Dim Sum', 'Noodles', 'Rice Bowls', 'Wok Tossed', 'Soups'],
    cuisineTags: ['Asian', 'Chinese', 'Thai'],
    images: [
      IMG('photo-1563245372-f21724e3856d'),
      IMG('photo-1612929633738-8fe44f7ec841'),
      IMG('photo-1585032226651-759b368d7246'),
      IMG('photo-1553621042-f6e147245754'),
    ],
    products: ['Veg Dimsum Basket', 'Chicken Dimsum', 'Chilli Garlic Noodles', 'Thai Green Curry', 'Kung Pao Chicken', 'Basil Fried Rice', 'Ramen Bowl', 'Spring Rolls', 'Sushi Rolls', 'Tom Yum Soup'],
  },
  Cafe: {
    categories: ['Coffee', 'Sandwiches', 'Bakery', 'Breakfast', 'Desserts'],
    cuisineTags: ['Cafe', 'Bakery'],
    images: [
      IMG('photo-1495474472287-4d71bcdd2085'),
      IMG('photo-1509042239860-f550ce710b93'),
      IMG('photo-1528735602780-2552fd46c7af'),
      IMG('photo-1517433367423-c7e5b0f35086'),
    ],
    products: ['Cappuccino', 'Iced Latte', 'Cold Brew', 'Grilled Cheese Sandwich', 'Pesto Veg Sandwich', 'Avocado Toast', 'Butter Croissant', 'Blueberry Muffin', 'Chocolate Brownie', 'Classic Pancakes'],
  },
  Desserts: {
    categories: ['Cakes', 'Ice Cream', 'Waffles', 'Shakes', 'Pastries'],
    cuisineTags: ['Desserts', 'Bakery'],
    images: [
      IMG('photo-1551024506-0bccd828d307'),
      IMG('photo-1497034825429-c343d7c6a68f'),
      IMG('photo-1562376552-0d160a2f238d'),
      IMG('photo-1572490122747-3968b75cc699'),
    ],
    products: ['Chocolate Truffle Cake', 'Red Velvet Slice', 'Belgian Waffle', 'Nutella Pancakes', 'Vanilla Sundae', 'Brownie Fudge', 'Strawberry Shake', 'Mango Cheesecake', 'Macaron Box', 'Cookie Dough Cup'],
  },
  Healthy: {
    categories: ['Salads', 'Bowls', 'Smoothies', 'Wraps', 'Protein Plates'],
    cuisineTags: ['Healthy', 'Continental'],
    images: [
      IMG('photo-1512621776951-a57141f2eefd'),
      IMG('photo-1546069901-ba9599a7e63c'),
      IMG('photo-1553530666-ba11a7da3888'),
      IMG('photo-1511690743698-d9d85f2fbf38'),
    ],
    products: ['Greek Salad', 'Quinoa Power Bowl', 'Paneer Protein Bowl', 'Chicken Caesar Wrap', 'Berry Smoothie', 'Mango Protein Shake', 'Hummus Platter', 'Millet Khichdi Bowl', 'Tofu Rice Bowl', 'Granola Parfait'],
  },
  Burgers: {
    categories: ['Burgers', 'Fries', 'Wings', 'Wraps', 'Shakes'],
    cuisineTags: ['Burgers', 'Fast Food'],
    images: [
      IMG('photo-1568901346375-23c9450c58cd'),
      IMG('photo-1571091718767-18b5b1457add'),
      IMG('photo-1541592106381-b31e9677c0e5'),
      IMG('photo-1563805042-7684c019e1cb'),
    ],
    products: ['Classic Veg Burger', 'Crispy Chicken Burger', 'Cheese Burst Burger', 'Peri Peri Fries', 'Loaded Nacho Fries', 'BBQ Wings', 'Paneer Wrap', 'Chicken Wrap', 'Chocolate Shake', 'Onion Rings'],
  },
  SouthIndian: {
    categories: ['Dosa', 'Idli & Vada', 'Meals', 'Rice', 'Beverages'],
    cuisineTags: ['South Indian', 'Meals'],
    images: [
      IMG('photo-1630409351241-e90e7f5e434d'),
      IMG('photo-1668236543090-82eba5ee5976'),
      IMG('photo-1606491956689-2ea866880c84'),
      IMG('photo-1596797038530-2c107229654b'),
    ],
    products: ['Masala Dosa', 'Ghee Roast Dosa', 'Idli Sambar', 'Medu Vada', 'Mini Tiffin', 'Curd Rice', 'Lemon Rice', 'South Indian Thali', 'Filter Coffee', 'Rava Kesari'],
  },
};

const RESTAURANT_FIXTURES = [
  ['Urban Tandoor', 'North Indian', RESTAURANT_TYPE.QSR],
  ['Saffron Street', 'North Indian', RESTAURANT_TYPE.CASUAL_DINING],
  ['Punjab Pantry', 'North Indian', RESTAURANT_TYPE.CASUAL_DINING],
  ['Delhi Curry House', 'North Indian', RESTAURANT_TYPE.QSR],
  ['Naan Nation', 'North Indian', RESTAURANT_TYPE.QSR],
  ['Bella Crust', 'Italian', RESTAURANT_TYPE.CASUAL_DINING],
  ['Pasta Piazza', 'Italian', RESTAURANT_TYPE.CAFE],
  ['Roma Slice Co', 'Italian', RESTAURANT_TYPE.QSR],
  ['Olive & Basil', 'Italian', RESTAURANT_TYPE.CASUAL_DINING],
  ['Napoli Oven', 'Italian', RESTAURANT_TYPE.QSR],
  ['Dragon Bowl', 'Asian', RESTAURANT_TYPE.CLOUD_KITCHEN],
  ['Wok Republic', 'Asian', RESTAURANT_TYPE.QSR],
  ['Momo Monk', 'Asian', RESTAURANT_TYPE.QSR],
  ['Tokyo Bento Bar', 'Asian', RESTAURANT_TYPE.CASUAL_DINING],
  ['Thai Lantern', 'Asian', RESTAURANT_TYPE.CASUAL_DINING],
  ['Bean Theory', 'Cafe', RESTAURANT_TYPE.CAFE],
  ['Roast & Rise', 'Cafe', RESTAURANT_TYPE.CAFE],
  ['Paper Cup Cafe', 'Cafe', RESTAURANT_TYPE.CAFE],
  ['The Breakfast Lab', 'Cafe', RESTAURANT_TYPE.CAFE],
  ['Brew Boulevard', 'Cafe', RESTAURANT_TYPE.CAFE],
  ['Sugarcraft', 'Desserts', RESTAURANT_TYPE.DESSERT],
  ['Waffle Window', 'Desserts', RESTAURANT_TYPE.DESSERT],
  ['Velvet Crumb', 'Desserts', RESTAURANT_TYPE.BAKERY],
  ['Gelato Grove', 'Desserts', RESTAURANT_TYPE.DESSERT],
  ['Cake Canvas', 'Desserts', RESTAURANT_TYPE.BAKERY],
  ['Fresh Fork', 'Healthy', RESTAURANT_TYPE.QSR],
  ['Green Grain', 'Healthy', RESTAURANT_TYPE.CAFE],
  ['Bowl Culture', 'Healthy', RESTAURANT_TYPE.QSR],
  ['Lean Leaf Kitchen', 'Healthy', RESTAURANT_TYPE.CLOUD_KITCHEN],
  ['Sprout Social', 'Healthy', RESTAURANT_TYPE.CAFE],
  ['Burger Cartel', 'Burgers', RESTAURANT_TYPE.QSR],
  ['Stack Shack', 'Burgers', RESTAURANT_TYPE.QSR],
  ['Grill District', 'Burgers', RESTAURANT_TYPE.CASUAL_DINING],
  ['Wing Works', 'Burgers', RESTAURANT_TYPE.QSR],
  ['Patty Project', 'Burgers', RESTAURANT_TYPE.FOOD_TRUCK],
  ['Dosa District', 'SouthIndian', RESTAURANT_TYPE.QSR],
  ['Idli Theory', 'SouthIndian', RESTAURANT_TYPE.QSR],
  ['Madras Meals', 'SouthIndian', RESTAURANT_TYPE.CASUAL_DINING],
  ['Filter Coffee House', 'SouthIndian', RESTAURANT_TYPE.CAFE],
  ['Coastal Tiffin Co', 'SouthIndian', RESTAURANT_TYPE.QSR],
  ['Spice Route Bowls', 'Asian', RESTAURANT_TYPE.CLOUD_KITCHEN],
  ['Heritage Thali', 'North Indian', RESTAURANT_TYPE.CASUAL_DINING],
  ['Garden Pantry', 'Healthy', RESTAURANT_TYPE.CAFE],
  ['Crust Collective', 'Italian', RESTAURANT_TYPE.QSR],
  ['Cocoa Corner', 'Desserts', RESTAURANT_TYPE.DESSERT],
  ['Morning Mug', 'Cafe', RESTAURANT_TYPE.CAFE],
  ['Kebab County', 'North Indian', RESTAURANT_TYPE.QSR],
  ['Bao & Beyond', 'Asian', RESTAURANT_TYPE.QSR],
  ['Farm Bowl Co', 'Healthy', RESTAURANT_TYPE.QSR],
  ['Burger Foundry', 'Burgers', RESTAURANT_TYPE.QSR],
];

const OWNER_FIRST_NAMES = ['Aarav', 'Anaya', 'Kabir', 'Meera', 'Ishaan', 'Riya', 'Vivaan', 'Tara', 'Arjun', 'Naina'];
const OWNER_LAST_NAMES = ['Mehta', 'Kapoor', 'Rao', 'Shah', 'Gupta', 'Bose', 'Nair', 'Malhotra', 'Iyer', 'Khan'];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function addressFor(city, i) {
  return {
    line1: `${12 + i}, ${city.area} Market Road`,
    line2: i % 2 === 0 ? 'Near Metro Gate' : 'Opposite Central Plaza',
    city: city.city,
    state: city.state,
    country: 'India',
    pincode: city.pin,
  };
}

function businessHours(i) {
  const late = i % 5 === 0;
  return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => ({
    day,
    open: day === 'sunday' ? '10:00' : '09:00',
    close: late || ['friday', 'saturday'].includes(day) ? '23:30' : '22:30',
    isOpen: true,
  }));
}

function productDescription(name, restaurantName, category) {
  return `${name} from ${restaurantName}, prepared fresh for the ${category.toLowerCase()} menu.`;
}

export class MarketplaceDemoSeeder extends BaseSeeder {
  constructor({ users = userRepository, passwords = passwordService, logger } = {}) {
    super();
    this.name = '017-marketplace-demo-50-restaurants';
    this.users = users;
    this.passwords = passwords;
    this.logger = logger ?? baseLogger({ module: 'organization', component: 'marketplace-demo-seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = {
      users: { created: 0, skipped: 0 },
      organizations: { created: 0, skipped: 0 },
      memberships: { created: 0, skipped: 0 },
      restaurants: { created: 0, skipped: 0 },
      branches: { created: 0, skipped: 0 },
      menus: { created: 0, skipped: 0 },
      categories: { created: 0, skipped: 0 },
      products: { created: 0, skipped: 0 },
    };

    const passwordHash = await this.passwords.hash(DEMO_PASSWORD);

    for (let i = 0; i < RESTAURANT_COUNT; i += 1) {
      const [name, poolKey, type] = RESTAURANT_FIXTURES[i];
      const pool = PRODUCT_POOLS[poolKey];
      const city = CITY_FIXTURES[i % CITY_FIXTURES.length];
      const slug = slugify(name);
      const owner = await this.#owner(i, name, passwordHash, summary);
      const organization = await this.#organization(i, name, slug, owner, summary);
      await this.#membership(owner, organization, summary);
      const restaurant = await this.#restaurant(i, name, slug, type, pool, city, organization, owner, summary);
      await this.#branches(i, name, slug, pool, city, organization, restaurant, owner, summary);
      const menu = await this.#menu(name, slug, pool, organization, restaurant, summary);
      const categoryMap = await this.#categories(slug, pool, organization, restaurant, menu, summary);
      await this.#products(name, slug, pool, organization, restaurant, menu, categoryMap, summary);
    }

    this.logger.info({ summary }, 'Marketplace demo seed complete');
    return summary;
  }

  async #owner(i, restaurantName, passwordHash, summary) {
    const email = `owner+demo${String(i + 1).padStart(2, '0')}@keventers.demo`;
    let user = await this.users.findByEmail(email);
    if (user) {
      summary.users.skipped += 1;
      return user;
    }

    user = await this.users.create({
      email,
      phone: `+9198100${String(i + 1).padStart(5, '0')}`,
      passwordHash,
      firstName: OWNER_FIRST_NAMES[i % OWNER_FIRST_NAMES.length],
      lastName: OWNER_LAST_NAMES[i % OWNER_LAST_NAMES.length],
      type: USER_TYPE.STAFF,
      status: USER_STATUS.ACTIVE,
      emailVerified: true,
      roles: [ORG_ROLES.ORGANIZATION_ADMIN],
      permissions: [],
      profile: {
        avatarUrl: IMG('photo-1507003211169-0a1dd7228f2d', 400),
        bio: `Demo owner for ${restaurantName}.`,
      },
      passwordChangedAt: new Date('2026-07-01T00:00:00.000Z'),
    });
    summary.users.created += 1;
    return user;
  }

  async #organization(i, name, slug, owner, summary) {
    let organization = await Organization.findOne({ slug: `${slug}-demo` });
    if (organization) {
      summary.organizations.skipped += 1;
      return organization;
    }

    organization = await Organization.create({
      name: `${name} Hospitality`,
      slug: `${slug}-demo`,
      brandName: name,
      ownerUserId: owner.id ?? owner._id,
      status: ORGANIZATION_STATUS.ACTIVE,
      contact: {
        email: `ops+${slug}@keventers.demo`,
        phone: `+9188200${String(i + 1).padStart(5, '0')}`,
      },
      subscription: {
        plan: i % 7 === 0 ? SUBSCRIPTION_PLAN.ENTERPRISE : SUBSCRIPTION_PLAN.PRO,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        trialStartedAt: new Date('2026-06-01T00:00:00.000Z'),
        trialEndsAt: new Date('2026-06-14T23:59:59.000Z'),
        currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-07-31T23:59:59.000Z'),
        maxRestaurants: 3,
        maxBranches: 12,
      },
    });
    summary.organizations.created += 1;
    return organization;
  }

  async #membership(owner, organization, summary) {
    const userId = owner.id ?? owner._id;
    const organizationId = organization.id ?? organization._id;
    const existing = await Membership.findOne({ userId, organizationId, restaurantId: null, branchId: null });
    if (existing) {
      summary.memberships.skipped += 1;
      return existing;
    }

    const membership = await Membership.create({
      userId,
      organizationId,
      scope: MEMBERSHIP_SCOPE.ORGANIZATION,
      role: ORG_ROLES.ORGANIZATION_ADMIN,
      isOwner: true,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });
    summary.memberships.created += 1;
    return membership;
  }

  async #restaurant(i, name, slug, type, pool, city, organization, owner, summary) {
    const organizationId = organization.id ?? organization._id;
    let restaurant = await Restaurant.findOne({ organizationId, slug });
    if (restaurant) {
      summary.restaurants.skipped += 1;
      return restaurant;
    }

    restaurant = await Restaurant.create({
      organizationId,
      name,
      slug,
      type,
      cuisines: pool.cuisineTags,
      address: addressFor(city, i),
      status: RESTAURANT_STATUS.ACTIVE,
      managerUserId: owner.id ?? owner._id,
      settings: {
        branding: {
          logoUrl: IMG('photo-1517248135467-4c7edcad34c4', 300),
          coverImageUrl: pool.images[i % pool.images.length],
        },
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        contact: {
          email: `hello+${slug}@keventers.demo`,
          phone: `+9170300${String(i + 1).padStart(5, '0')}`,
          website: `https://${slug}.example.com`,
        },
        delivery: { enabled: i % 3 !== 0, radiusKm: 5 + (i % 5) },
        orderPreferences: { dineIn: true, takeaway: true, delivery: i % 3 !== 0, minOrderAmount: i % 4 === 0 ? 199 : 0 },
        qr: { enabled: true, requireTableSelection: true, logoOnQr: true },
      },
      onboarding: {
        started: true,
        startedAt: new Date('2026-07-01T10:00:00.000Z'),
        completed: true,
        completedAt: new Date('2026-07-02T10:00:00.000Z'),
        completedSteps: ['logo', 'business_hours', 'currency', 'taxes', 'timezone', 'qr_settings', 'table_count'],
      },
    });
    summary.restaurants.created += 1;
    return restaurant;
  }

  async #branches(i, name, slug, pool, city, organization, restaurant, owner, summary) {
    const count = (i % 4) + 1;
    for (let j = 0; j < count; j += 1) {
      const cityFixture = CITY_FIXTURES[(i + j) % CITY_FIXTURES.length];
      const branchSlug = `${slug}-${slugify(cityFixture.area)}${j === 0 ? '' : `-${j + 1}`}`;
      const existing = await Branch.findOne({ slug: branchSlug });
      if (existing) {
        summary.branches.skipped += 1;
        continue;
      }

      await Branch.create({
        organizationId: organization.id ?? organization._id,
        restaurantId: restaurant.id ?? restaurant._id,
        name: `${name} ${cityFixture.area}`,
        code: `${slug.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, '0')}-${j + 1}`,
        slug: branchSlug,
        address: addressFor(cityFixture, i + j),
        location: {
          type: 'Point',
          coordinates: [cityFixture.lng + j * 0.004, cityFixture.lat + j * 0.004],
        },
        discovery: {
          coverImageUrl: pool.images[(i + j) % pool.images.length],
          gallery: pool.images.map((url, index) => ({ url, alt: `${name} gallery ${index + 1}` })),
          description: `${name} brings ${pool.cuisineTags.join(' and ')} favourites to ${cityFixture.area}.`,
          area: cityFixture.area,
          rating: Number((4.1 + ((i + j) % 9) / 10).toFixed(1)),
          ratingCount: 120 + i * 13 + j * 29,
          prepTimeMinutes: 12 + ((i + j) % 12),
          featured: i % 6 === 0 || j === 0,
          promoted: i % 10 === 0,
          popularityScore: 70 + ((i * 7 + j * 11) % 30),
          offer: i % 5 === 0 ? { label: '20% off', description: 'Auto-applied on select menu items.' } : null,
          services: [
            { mode: 'dine_in', available: true, etaMinutes: 15 },
            { mode: 'takeaway', available: true, etaMinutes: 20 },
            { mode: 'delivery', available: i % 3 !== 0, etaMinutes: 35 },
          ],
          amenities: ['QR ordering', 'Digital payments', j % 2 === 0 ? 'Outdoor seating' : 'Family tables'],
        },
        businessHours: businessHours(i + j),
        managerUserId: owner.id ?? owner._id,
        isPrimary: j === 0,
        status: BRANCH_STATUS.ACTIVE,
        settings: {
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          acceptsOnlineOrders: true,
          tableCount: 8 + ((i + j) % 18),
        },
      });
      summary.branches.created += 1;
    }
  }

  async #menu(name, slug, pool, organization, restaurant, summary) {
    const tenant = { organizationId: organization.id ?? organization._id, restaurantId: restaurant.id ?? restaurant._id };
    let menu = await Menu.findOne({ restaurantId: tenant.restaurantId, slug: `${slug}-all-day` });
    if (menu) {
      summary.menus.skipped += 1;
      return menu;
    }

    menu = await Menu.create({
      ...tenant,
      name: `${name} All Day Menu`,
      slug: `${slug}-all-day`,
      description: `Signature ${pool.cuisineTags.join(' and ')} menu.`,
      type: MENU_TYPE.REGULAR,
      status: MENU_STATUS.ACTIVE,
      isActive: true,
      isDefault: true,
      imageUrl: pool.images[0],
      publishedAt: new Date('2026-07-10T09:00:00.000Z'),
    });
    summary.menus.created += 1;
    return menu;
  }

  async #categories(restaurantSlug, pool, organization, restaurant, menu, summary) {
    const tenant = { organizationId: organization.id ?? organization._id, restaurantId: restaurant.id ?? restaurant._id };
    const categoryMap = new Map();
    for (const [index, name] of pool.categories.entries()) {
      const slug = `${restaurantSlug}-${slugify(name)}`;
      let category = await Category.findOne({ restaurantId: tenant.restaurantId, name });
      if (category) {
        if (category.slug !== slug) {
          category.slug = slug;
          category.menuId = menu.id ?? menu._id;
          category.imageUrl = category.imageUrl ?? pool.images[index % pool.images.length];
          await category.save();
        }
        summary.categories.skipped += 1;
      } else {
        category = await Category.create({
          ...tenant,
          menuId: menu.id ?? menu._id,
          name,
          slug,
          description: `${name} favourites`,
          imageUrl: pool.images[index % pool.images.length],
          depth: 0,
          parentId: null,
          displayOrder: index,
          isFeatured: index < 2,
          status: CATEGORY_STATUS.ACTIVE,
        });
        summary.categories.created += 1;
      }
      categoryMap.set(name, category);
    }
    return categoryMap;
  }

  async #products(name, slug, pool, organization, restaurant, menu, categoryMap, summary) {
    const tenant = { organizationId: organization.id ?? organization._id, restaurantId: restaurant.id ?? restaurant._id };
    for (let i = 0; i < PRODUCTS_PER_RESTAURANT; i += 1) {
      const productName = pool.products[i];
      const categoryName = pool.categories[i % pool.categories.length];
      const category = categoryMap.get(categoryName);
      const productSlug = `${slug}-${slugify(productName)}`;
      const existing = await Product.findOne({ restaurantId: tenant.restaurantId, slug: productSlug });
      if (existing) {
        summary.products.skipped += 1;
        continue;
      }

      const image = pool.images[i % pool.images.length];
      await Product.create({
        ...tenant,
        categoryId: category.id ?? category._id,
        rootCategoryId: category.id ?? category._id,
        menuIds: [menu.id ?? menu._id],
        name: productName,
        slug: productSlug,
        description: productDescription(productName, name, categoryName),
        shortDescription: `Fresh ${categoryName.toLowerCase()} favourite.`,
        sku: `${slug.slice(0, 4).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        images: [{ url: image, alt: productName, displayOrder: 0 }],
        thumbnailUrl: image,
        heroImageUrl: image,
        pricing: {
          basePrice: 149 + ((i * 35 + slug.length * 7) % 360),
          compareAtPrice: i % 3 === 0 ? 249 + ((i * 45 + slug.length * 7) % 420) : null,
          taxIncluded: false,
        },
        preparationTimeMinutes: 8 + (i % 12),
        dietaryTags: i % 4 === 1 ? ['non_vegetarian'] : ['vegetarian'],
        allergens: i % 3 === 0 ? ['milk'] : [],
        spiceLevel: ['none', 'mild', 'medium', 'hot'][i % 4],
        nutrition: {
          calories: 220 + i * 35,
          servingSize: '1 portion',
          protein: 8 + (i % 6),
          carbs: 24 + i * 3,
          fat: 6 + (i % 7),
        },
        tags: [...pool.cuisineTags, categoryName, productName],
        availability: { status: 'available', scheduled: false },
        status: PRODUCT_STATUS.ACTIVE,
        isFeatured: i < 2,
        isPopular: i % 3 === 0,
        isRecommended: i % 4 === 0,
        displayOrder: i,
        metadata: { seededBy: 'marketplace-demo', productPool: pool.cuisineTags[0] },
      });
      summary.products.created += 1;
    }
  }
}

export const marketplaceDemoSeeder = new MarketplaceDemoSeeder();
export default marketplaceDemoSeeder;
