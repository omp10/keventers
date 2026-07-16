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
