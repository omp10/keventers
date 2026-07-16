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

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
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
export type LoyaltyTier = { name: string; level?: number };

export type LoyaltyAccount = {
  balance: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
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
export type CustomerProfile = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  isGuest: boolean;
  preferences?: { defaultVeg?: boolean };
  marketing?: { email?: boolean; sms?: boolean; whatsapp?: boolean };
};
