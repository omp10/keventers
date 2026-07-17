import type { Money } from '@/features/ordering';

export type AdminStatus = 'active' | 'pending' | 'suspended' | 'disabled' | 'rejected';
/**
 * Platform analytics projection (`GET /admin/analytics/platform`). Mirrors the
 * backend's grouped DTO exactly — every figure is BACKEND-COMPUTED and all money
 * is an integer in MINOR units (paise), per the analytics contract.
 */
export type PlatformKpis = {
  sales: { grossRevenue: number; netRevenue: number; taxTotal: number; discountTotal: number; refundTotal: number; itemCount: number; ordersCompleted: number; averageOrderValue: number };
  orders: { ordersPlaced: number; ordersCompleted: number; ordersCancelled: number; averagePrepTimeMs: number; averageCompletionTimeMs: number };
  customers: { newCustomers: number; returningCustomers: number; loyaltyEarned: number; loyaltyRedeemed: number; referralsCompleted: number };
  payments: { captured: number; failed: number; refunded: number; capturedAmount: number; refundedAmount: number; successRate: number | null; failureRate: number | null; refundRate: number | null };
  notificationHealth: { queued: number; sent: number; delivered: number; read: number; failed: number; deliveryRate: number | null; readRate: number | null; failureRate: number | null };
  providerDistribution: { provider: string; count: number }[];
};
export type Organization = { id: string; name: string; slug?: string; status: AdminStatus; subscription?: { plan?: string; status?: string; trialEndsAt?: string }; restaurantCount?: number; branchCount?: number; ownerEmail?: string; createdAt?: string };
export type OnboardingApplication = { id: string; businessName: string; ownerName?: string; email?: string; city?: string; status: AdminStatus; submittedAt?: string; documents?: { name: string; url: string }[] };
export type PlatformUser = { id: string; name?: string; email: string; type?: string; status: AdminStatus; roles?: string[]; lastLoginAt?: string; createdAt?: string };
export type PlatformPayment = { id: string; orderId?: string; provider?: string; status: string; amount: Money; createdAt: string };
export type NotificationRecord = { id: string; title?: string; channel?: string; status: string; recipient?: string; createdAt?: string };
export type OnboardingFieldType = 'text' | 'email' | 'number' | 'textarea' | 'select' | 'file';
export type OnboardingFieldDefinition = {
  key: string; label: string; phase: 'application' | 'setup'; type: OnboardingFieldType;
  required: boolean; enabled: boolean; helpText: string; placeholder: string;
  options: string[]; acceptedFileTypes: string[]; maxFileSizeMb: number; multiple: boolean; order?: number;
};
export type OnboardingFormConfig = { fields: OnboardingFieldDefinition[]; updatedAt: string | null };

/* ── Platform content (admin-curated customer-facing surfaces) ───────────── */

export type ContentStatus = 'active' | 'inactive';

/** Uploaded image reference returned by the media endpoint. */
export type UploadedMedia = { url: string; key: string; publicId?: string; size?: number; mimeType?: string };

export type BannerTheme = 'brand' | 'accent' | 'image';
/** Homepage promotional slide. Mirrors the customer app's PromoBanner + admin fields. */
export type AdminBanner = {
  id: string;
  placement: string;
  title: string;
  subtitle?: string;
  theme: BannerTheme;
  imageUrl?: string;
  cta?: { label: string; href: string };
  branchSlug?: string;
  sortOrder: number;
  status: ContentStatus;
  startsAt?: string | null;
  endsAt?: string | null;
};

/** Storefront browse category (the customer home tiles). */
export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  icon: string;
  searchTerm: string;
  featured: boolean;
  sortOrder: number;
  status: ContentStatus;
};

export type ZoneStatus = 'active' | 'paused' | 'inactive';
/** Operating (delivery/service) coverage circle. */
export type AdminZone = {
  id: string;
  name: string;
  code?: string;
  city?: string;
  description?: string;
  type: 'delivery' | 'service';
  center: { lat: number; lng: number };
  radiusKm: number;
  deliveryFee?: number;
  minOrderAmount?: number;
  etaMinutes?: number | null;
  sortOrder: number;
  status: ZoneStatus;
};

/**
 * Write payloads. They mirror the read types except `imageUrl`, where `null`
 * explicitly CLEARS a stored image (vs. `undefined` = leave unchanged).
 */
export type BannerPayload = Partial<Omit<AdminBanner, 'imageUrl'>> & { imageUrl?: string | null };
export type CategoryPayload = Partial<Omit<AdminCategory, 'imageUrl'>> & { imageUrl?: string | null };

export type ServiceMode = 'dine_in' | 'takeaway' | 'delivery' | 'drive_thru' | 'curbside';
export type KitchenService = { mode: ServiceMode; available: boolean; etaMinutes?: number | null };

/** An outlet as customers discover it — the admin-editable discovery profile. */
export type AdminKitchen = {
  id: string;
  name: string;
  code: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended';
  restaurant?: { id: string; name: string; slug: string };
  restaurantId: string;
  address: { line1: string; city: string; state: string; pincode: string };
  location: { lat: number; lng: number } | null;
  discovery: {
    coverImageUrl: string;
    description: string;
    area: string;
    rating: number | null;
    ratingCount: number;
    prepTimeMinutes: number | null;
    featured: boolean;
    promoted: boolean;
    offer: { label: string; description: string } | null;
    popularityScore: number;
    services: KitchenService[];
  };
  acceptsOnlineOrders: boolean;
  tableCount: number;
};

export type RestaurantOption = { id: string; name: string; slug: string; status: string };

/* ── Kitchen detail ───────────────────────────────────────────────────────────
   One outlet seen from every angle: the menu its restaurant serves, the tables
   and QR codes guests order from, the staff rostered to it, and what it earns.
   The catalog is RESTAURANT-scoped (shared by every outlet of the brand), while
   tables/QR/orders/staff are BRANCH-scoped — the page labels which is which so
   an editor knows the blast radius of a change. */

/** A product as the admin catalog returns it (`/admin/catalog`). */
export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnailUrl?: string;
  heroImageUrl?: string;
  /**
   * Plain MAJOR-unit numbers in the restaurant's currency — NOT the minor-unit
   * Money DTO used by orders/payments. The cart converts these with
   * `Money.fromMajor` at checkout.
   */
  pricing: { basePrice: number; compareAtPrice?: number | null; promotionalPrice?: number | null; taxIncluded?: boolean };
  preparationTimeMinutes?: number;
  dietaryTags: string[];
  allergens: string[];
  spiceLevel?: string;
  availability: { status: string; unavailableReason?: string };
  status: string;
  isFeatured: boolean;
  isPopular: boolean;
  isRecommended: boolean;
  displayOrder: number;
  hasVariants: boolean;
  categoryId: string;
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
  parentId: string | null;
  depth: number;
  isSubcategory: boolean;
  status: string;
  isFeatured: boolean;
  displayOrder: number;
  subcategories?: CatalogCategory[];
  products?: CatalogProduct[];
};

export type CatalogMenu = {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  status: string;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
  categories?: CatalogCategory[];
};

/** Full menu tree for a restaurant (`GET /admin/catalog?restaurantId=`). */
export type KitchenCatalog = { restaurantId: string; menus: CatalogMenu[] };

export type CatalogCategoryStatus = 'active' | 'inactive';
export type CatalogProductStatus = 'draft' | 'active' | 'inactive' | 'archived';
export type CatalogAvailabilityStatus = 'available' | 'out_of_stock' | 'temporarily_disabled';

/** Catalog write payloads (PATCH `/restaurant/categories|products/:id`). Partial. */
export type CatalogCategoryPayload = {
  name?: string;
  description?: string;
  status?: CatalogCategoryStatus;
  isFeatured?: boolean;
};

export type CatalogProductPayload = {
  name?: string;
  description?: string;
  shortDescription?: string;
  /**
   * Price MUST be sent nested under `pricing`, in MAJOR units. The API also
   * accepts a top-level `basePrice`, but that shortcut is honoured only on
   * CREATE — `updateProduct` reads `data.pricing` alone, so a PATCH carrying
   * `basePrice` returns 200 and silently discards the new price.
   */
  pricing?: { basePrice?: number };
  preparationTimeMinutes?: number;
  status?: CatalogProductStatus;
  isFeatured?: boolean;
  isPopular?: boolean;
  isRecommended?: boolean;
  availability?: { status?: CatalogAvailabilityStatus; unavailableReason?: string };
};

/** Catalog counts (`GET /admin/catalog/stats?restaurantId=`). */
export type CatalogStats = {
  restaurantId: string;
  counts: { menus: number; activeMenus: number; categories: number; products: number; activeProducts: number };
};

/** A table at one outlet (`GET /admin/tables?restaurantId=&branchId=`). */
export type KitchenTable = {
  id: string;
  branchId: string;
  groupId: string | null;
  floor: string;
  zone: string;
  number: string;
  name: string;
  seatingCapacity: number;
  shape: string;
  status: string;
  isReserved: boolean;
  isOrderingEnabled: boolean;
  activeQrCodeId: string | null;
  currentSessionId: string | null;
  displayOrder: number;
};

/** A table's QR code (`GET /admin/qr/table/:tableId`). Never carries the signing secret. */
export type KitchenQrCode = {
  id: string;
  tableId: string;
  type: string;
  status: string;
  /** The scannable payload: `token.version.signature`. */
  code: string;
  scanUrl: string;
  imageUrl: string | null;
  secretVersion: number;
  expiresAt: string | null;
  scanCount: number;
  lastScannedAt: string | null;
};

/**
 * A person who runs this outlet (`GET /admin/kitchens/:id/staff`).
 *
 * Staff ARE memberships — there's no separate staff record. A membership reaches
 * this outlet either by naming it (`scope: 'branch'`, the people actually
 * rostered here) or by sitting above it (`restaurant`/`organization` scope, i.e.
 * brand managers and owners who cover every outlet). `atThisKitchen` is the
 * difference.
 */
export type KitchenStaff = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  scope: 'organization' | 'restaurant' | 'branch';
  atThisKitchen: boolean;
  isOwner: boolean;
  status: string;
  userStatus: string | null;
  lastLoginAt: string | null;
};

export type KitchenStaffResponse = {
  items: KitchenStaff[];
  counts: { total: number; atThisKitchen: number; byRole: Record<string, number> };
};

/** An order row at one outlet (`GET /admin/orders?restaurantId=&branchId=`). */
export type KitchenOrder = {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  total: Money;
  itemCount: number;
  tableId: string | null;
  placedAt: string | null;
  createdAt: string;
};
