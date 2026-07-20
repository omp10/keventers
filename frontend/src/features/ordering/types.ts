/**
 * ORDERING DOMAIN TYPES (Phase F3.2). Modeled on the backend Catalog / Cart /
 * Pricing / Order / Payment / Customer modules. Money is ALWAYS the backend's
 * serialized Money DTO (integer minor units + a precomputed `major` for display) —
 * the frontend NEVER does price math; it renders what the Pricing Engine returns.
 */
export type Money = {
  /** Integer minor units (e.g. paise). */
  amount: number;
  currency: string;
  /** Backend-formatted major value for display (e.g. 199.5). */
  major: number;
};

export type VegClass = 'veg' | 'non_veg' | 'egg';

// ---- Menu / Catalog ---------------------------------------------------------
export type MenuCategory = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
  order?: number;
  children?: MenuCategory[];
  /** Backend campaign/section hint (future). */
  section?: string;
};

export type ProductVariant = {
  id: string;
  name: string;
  price: Money;
  available: boolean;
  isDefault?: boolean;
};

export type ProductModifier = {
  id: string;
  name: string;
  price: Money;
  available: boolean;
  isDefault?: boolean;
};

export type ModifierGroup = {
  id: string;
  name: string;
  /** Selection rules — enforced by the backend; the UI mirrors them. */
  min: number;
  max: number;
  required: boolean;
  modifiers: ProductModifier[];
};

export type ProductAddon = {
  id: string;
  name: string;
  price: Money;
  available: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  categoryId: string;
  price: Money;
  /** Present when a promo/discount applies (backend-provided). */
  discountedPrice?: Money | null;
  rating?: number;
  prepTimeMinutes?: number;
  veg?: VegClass;
  popular?: boolean;
  recommended?: boolean;
  available: boolean;
  customizable: boolean;
  variants?: ProductVariant[];
  modifierGroups?: ModifierGroup[];
  addons?: ProductAddon[];
  tags?: string[];
  /** Nutrition placeholder (future). */
  nutrition?: { label: string; value: string }[];
};

export type ProductDetail = Product & {
  related?: Product[];
  /** Cross-sell / upsell suggestions from the backend. */
  crossSell?: Product[];
  upsell?: Product[];
};

export type BranchMenu = {
  branchSlug: string;
  branchName?: string;
  currency: string;
  categories: MenuCategory[];
  products: Product[];
  popular?: Product[];
  recommended?: Product[];
};

// ---- Cart / Pricing ---------------------------------------------------------
/** What the customer configured for a product — the ONLY thing the client sends. */
export type CartItemSelection = {
  productId: string;
  variantId?: string;
  modifierIds?: string[];
  addonIds?: string[];
  quantity: number;
  instructions?: string;
};

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  imageUrl?: string;
  variantName?: string;
  modifiers: { id: string; name: string }[];
  addons: { id: string; name: string }[];
  quantity: number;
  instructions?: string;
  /** Frozen snapshot prices from the backend (never recomputed here). */
  unitPrice: Money;
  lineTotal: Money;
};

export type TaxLine = { label: string; amount: Money };

/** The Pricing Engine breakdown — entirely READ-ONLY on the frontend. */
export type PricingBreakdown = {
  currency: string;
  subtotal: Money;
  discount?: Money | null;
  couponDiscount?: Money | null;
  taxes: TaxLine[];
  taxTotal: Money;
  serviceCharge?: Money | null;
  total: Money;
  savings?: Money | null;
};

export type AppliedCoupon = { code: string; label?: string; description?: string };

export type Cart = {
  id: string;
  /** Optimistic-concurrency token (If-Match). */
  version: number;
  branchSlug: string;
  items: CartItem[];
  itemCount: number;
  coupon?: AppliedCoupon | null;
  notes?: string;
  pricing: PricingBreakdown;
  estimatedMinutes?: number;
};

// ---- Order ------------------------------------------------------------------
export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'cancelled'
  | 'refund_pending'
  | 'refunded';

export type OrderChannel = 'dine_in' | 'takeaway' | 'delivery' | 'drive_thru' | 'curbside';

export type OrderTimelineEntry = { status: OrderStatus; at: string; note?: string };

/** Why an order was cancelled, and by whom — the customer is owed both. */
export type OrderCancellation = {
  reason?: string;
  source?: 'customer' | 'restaurant' | 'system' | string;
  at?: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  cancellation?: OrderCancellation | null;
  cancelledAt?: string | null;
  channel?: OrderChannel;
  branch: { slug: string; name: string; restaurantName?: string };
  items: CartItem[];
  pricing: PricingBreakdown;
  payment: { status: PaymentStatus; provider?: PaymentProvider };
  notes?: string;
  createdAt: string;
  estimatedMinutes?: number;
  readyAt?: string;
  timeline: OrderTimelineEntry[];
};

// ---- Payment ----------------------------------------------------------------
export type PaymentProvider = 'razorpay' | 'phonepe' | 'cash';
export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'cash';

export type PaymentStatus = 'pending' | 'processing' | 'authorized' | 'captured' | 'failed' | 'cancelled';

export type PaymentIntent = {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  amount: Money;
  status: PaymentStatus;
  /** Hosted-checkout redirect (PhonePe) — the frontend never builds this. */
  redirectUrl?: string;
  /** Provider handshake payload (Razorpay order/key) — passed to its widget. */
  providerPayload?: Record<string, unknown>;
};

// ---- Loyalty ----------------------------------------------------------------
/** The API sends the tier as a bare name ("bronze"), not an object. */
export type LoyaltyTier = string;

export type LoyaltyAccount = {
  balance: number;
  lifetimePoints: number;
  redeemedPoints?: number;
  tier: LoyaltyTier;
  tierUpdatedAt?: string | null;
  lastEarnedAt?: string | null;
  nextTier?: { name: string; pointsNeeded: number } | null;
};

export type LoyaltyReward = {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  type: 'discount' | 'free_product' | 'cashback' | 'coupon';
};

export type RedemptionPreview = {
  reward: LoyaltyReward;
  canRedeem: boolean;
  pointsAfter: number;
  reason?: string;
};

export type LoyaltyLedgerEntry = {
  id: string;
  points: number;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  description?: string;
  at: string;
};

// ---- Profile ----------------------------------------------------------------
/**
 * The customer's record at ONE restaurant (loyalty and history are per-brand on a
 * white-label platform). `profile.service` maps this from the API — read the note
 * there before adding a field. Identity (name to greet, phone to sign in with)
 * lives on the ACCOUNT and comes from the Auth Platform; `name` here is the name
 * this restaurant knows them by.
 */
export type CustomerProfile = {
  id?: string;
  name?: string;
  phone?: string;
  /** Absent for phone-first accounts — see `realEmail` in the service. */
  email?: string;
  marketingOptIn: boolean;
  preferences: CustomerPreferences;
  stats: CustomerStats;
  memberSince?: string;
};

/** Order/visit projection maintained by the backend. Money is in MINOR units. */
export type CustomerStats = {
  totalOrders: number;
  completedOrders: number;
  lifetimeSpend: number;
  avgOrderValue: number;
  visitCount: number;
  lastVisitAt?: string;
};

export type CustomerPreferences = {
  dietary: string[];
  allergies: string[];
  language: string;
  notifications: { orderUpdates: boolean; promotions: boolean; loyalty: boolean };
};

export type CustomerAddress = {
  id: string;
  type?: 'home' | 'work' | 'other';
  label?: string;
  contactName?: string;
  contactPhone?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isDefault?: boolean;
};
