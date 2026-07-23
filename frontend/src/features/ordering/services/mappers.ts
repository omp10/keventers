import { getActiveBranchSlug } from '@/features/discovery';
import type {
  AppliedCoupon,
  Cart,
  CartItem,
  Money,
  Order,
  OrderStatus,
  OrderTimelineEntry,
  PricingBreakdown,
} from '../types';

/**
 * BACKEND DTO → VIEW-TYPE mappers. The backend's cart/order DTOs are richer and
 * shaped for its own modules (nested snapshots, grouped discounts, tax objects);
 * the UI's types are flat and render-ready. This file is the ONE place the two
 * meet — components never see a raw backend payload, and a backend field rename
 * breaks here (loudly, typed) instead of deep inside a component's `.map`.
 *
 * No price is ever computed: every Money below is passed through exactly as the
 * Pricing Engine emitted it.
 */

/* Backend wire shapes (the parts we consume) — kept local on purpose. */
type WireMoney = { amount: number; currency: string; major: number };
type WireCartItem = {
  id: string;
  productId: string;
  product?: { name?: string; slug?: string; thumbnailUrl?: string | null; heroImageUrl?: string | null } | null;
  variant?: { name?: string } | null;
  modifiers?: { modifierId?: string; name?: string }[];
  addons?: { addonId?: string; name?: string }[];
  quantity: number;
  specialInstructions?: string;
  /** Item-level money is PLAIN MINOR-UNIT integers (unlike the pricing block). */
  pricing?: { currency?: string; unitPrice?: number } | null;
  lineSubtotal?: number;
};
type WirePricing = {
  currency?: string;
  subtotal?: WireMoney;
  discounts?: { total?: WireMoney; coupon?: WireMoney; couponApplied?: boolean };
  tax?: { lines?: { name?: string; label?: string; amount?: WireMoney }[]; total?: WireMoney };
  serviceCharge?: WireMoney;
  charges?: { total?: WireMoney };
  total?: WireMoney;
};
type WireCart = {
  id: string;
  version?: number;
  branchId?: string | null;
  items?: WireCartItem[];
  itemCount?: number;
  coupon?: { code?: string } | null;
  currency?: string;
  pricing?: WirePricing;
};
type WireOrder = WireCart & {
  /** Order history now sends the real branch; the cache is only a fallback. */
  branch?: { id?: string; name?: string; slug?: string } | null;
  orderNumber?: string;
  status?: string;
  channel?: string;
  timeline?: { newStatus?: string; at?: string; reason?: string }[];
  payment?: { status?: string | null; provider?: string };
  placedAt?: string;
  createdAt?: string;
};

/**
 * The wire uses the ORDER module's payment vocabulary (`awaiting_payment`,
 * `not_required`, …); the UI's PaymentStatus + presentation maps don't. Passing
 * an unmapped value through crashed every `PAYMENT_STATUS_PRESENTATION[status]`
 * lookup ("cannot read properties of undefined"). Normalize here — unknown
 * values degrade to 'pending' instead of taking the page down.
 */
function mapPaymentStatus(raw?: string | null): Order['payment']['status'] {
  switch (raw) {
    case 'awaiting_payment':
    case 'not_required':
    case null:
    case undefined:
      return 'pending';
    case 'processing':
    case 'authorized':
    case 'captured':
    case 'failed':
    case 'cancelled':
      return raw;
    default:
      return 'pending';
  }
}

const ZERO: Money = { amount: 0, currency: 'INR', major: 0 };
const money = (m?: WireMoney | null): Money => m ?? ZERO;
const positive = (m?: WireMoney | null): Money | null => (m && m.amount > 0 ? m : null);

/**
 * Item-level amounts arrive as PLAIN MINOR-UNIT integers (e.g. 14900 = ₹149) —
 * only the top-level pricing block carries full Money DTOs. Converting minor →
 * major here is unit normalization of a backend-provided value (the same
 * relationship the backend's own Money DTO encodes), not price computation.
 */
const minorToMoney = (minor: number | undefined | null, currency: string): Money => ({
  amount: minor ?? 0,
  currency,
  major: (minor ?? 0) / 100,
});

/** Branch context for headers/navigation — remembered when the session opened. */
const BRANCH_NAME_KEY = 'kv-active-branch-name';
export function rememberBranchName(name?: string) {
  try {
    if (name) localStorage.setItem(BRANCH_NAME_KEY, name);
  } catch {
    /* ignore */
  }
}
function recallBranch() {
  let name = '';
  try {
    name = localStorage.getItem(BRANCH_NAME_KEY) ?? '';
  } catch {
    /* ignore */
  }
  return { slug: getActiveBranchSlug() ?? '', name };
}

function mapItem(it: WireCartItem, currency: string): CartItem {
  const itemCurrency = it.pricing?.currency ?? currency;
  return {
    id: it.id,
    productId: it.productId,
    name: it.product?.name ?? 'Item',
    imageUrl: it.product?.thumbnailUrl ?? it.product?.heroImageUrl ?? undefined,
    variantName: it.variant?.name,
    modifiers: (it.modifiers ?? []).map((m) => ({ id: m.modifierId ?? m.name ?? '', name: m.name ?? '' })),
    addons: (it.addons ?? []).map((a) => ({ id: a.addonId ?? a.name ?? '', name: a.name ?? '' })),
    quantity: it.quantity,
    instructions: it.specialInstructions || undefined,
    unitPrice: minorToMoney(it.pricing?.unitPrice, itemCurrency),
    lineTotal: minorToMoney(it.lineSubtotal, itemCurrency),
  };
}

function mapPricing(p?: WirePricing): PricingBreakdown {
  return {
    currency: p?.currency ?? 'INR',
    subtotal: money(p?.subtotal),
    // `discounts.total` already INCLUDES the coupon — showing it as one line
    // avoids double-counting in the UI; `savings` mirrors it for the banner.
    discount: positive(p?.discounts?.total),
    couponDiscount: null,
    taxes: (p?.tax?.lines ?? []).map((t) => ({ label: t.label ?? t.name ?? 'Tax', amount: money(t.amount) })),
    taxTotal: money(p?.tax?.total),
    serviceCharge: positive(p?.serviceCharge),
    total: money(p?.total),
    savings: positive(p?.discounts?.total),
  };
}

export function mapCart(raw: WireCart): Cart {
  const currency = raw.currency ?? raw.pricing?.currency ?? 'INR';
  const items = (raw.items ?? []).map((it) => mapItem(it, currency));
  const coupon: AppliedCoupon | null = raw.coupon?.code ? { code: raw.coupon.code } : null;
  return {
    id: raw.id,
    version: raw.version ?? 0,
    branchSlug: recallBranch().slug,
    // The SERVER's branch for this cart. `branchSlug` above is a localStorage
    // recollection that can be stale or absent; this is authoritative and is
    // what tells us a cart belongs to a different outlet than the menu on
    // screen.
    branchId: raw.branchId ?? null,
    items,
    itemCount: raw.itemCount ?? items.reduce((n, i) => n + i.quantity, 0),
    coupon,
    pricing: mapPricing(raw.pricing),
  };
}

export function mapOrder(raw: WireOrder): Order {
  // Prefer the branch the SERVER sent: `recallBranch()` only knows the outlet
  // this device last visited, so every past order from another outlet rendered
  // a blank restaurant name in history.
  const cached = recallBranch();
  const branch = raw.branch?.name
    ? { name: raw.branch.name, slug: raw.branch.slug ?? cached.slug }
    : cached;
  const currency = raw.currency ?? raw.pricing?.currency ?? 'INR';
  return {
    id: raw.id,
    orderNumber: raw.orderNumber ?? '',
    status: (raw.status ?? 'placed') as OrderStatus,
    channel: raw.channel as Order['channel'],
    branch: { slug: branch.slug, name: branch.name },
    items: (raw.items ?? []).map((it) => mapItem(it, currency)),
    pricing: mapPricing(raw.pricing),
    payment: {
      status: mapPaymentStatus(raw.payment?.status),
      provider: raw.payment?.provider as Order['payment']['provider'],
    },
    createdAt: raw.createdAt ?? raw.placedAt ?? new Date().toISOString(),
    timeline: (raw.timeline ?? [])
      .filter((t) => t.newStatus && t.at)
      .map((t): OrderTimelineEntry => ({ status: t.newStatus as OrderStatus, at: t.at!, note: t.reason || undefined })),
  };
}
