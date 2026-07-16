import type { Money, PaymentStatus } from '@/features/ordering';
import type { GeoPoint } from '@/features/discovery';

/**
 * RESTAURANT BUSINESS MANAGEMENT DOMAIN TYPES (Phase F4.3). Reuses Money/PaymentStatus
 * (ordering) and GeoPoint (discovery). These describe what the management UI EDITS
 * and DISPLAYS; the backend (Identity/Organization/QR/Pricing/Payments/Customer/
 * Notification/Analytics) owns every rule — RBAC resolution, serviceability, pricing,
 * settlement, availability. The frontend never computes those.
 */
export type { Money, PaymentStatus } from '@/features/ordering';
export type { GeoPoint } from '@/features/discovery';

export type EntityStatus = 'active' | 'disabled' | 'invited' | 'archived';

// ---- Staff / Identity -------------------------------------------------------
export type Staff = {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roles?: string[];
  branchIds?: string[];
  branchNames?: string[];
  department?: string;
  status: 'active' | 'disabled' | 'invited';
  lastLoginAt?: string;
  createdAt?: string;
};

export type StaffInvite = { email: string; name?: string; role: string; branchIds?: string[]; department?: string };

export type StaffSession = { id: string; device?: string; ip?: string; location?: string; lastActiveAt: string; current?: boolean };
export type StaffDevice = { id: string; name: string; lastUsedAt: string; trusted?: boolean };
export type AccessLog = { id: string; action: string; actor?: string; at: string; ip?: string; detail?: string };

// ---- Roles & permissions ----------------------------------------------------
export type Permission = { key: string; resource: string; action: string; description?: string };
export type Role = { id: string; name: string; description?: string; permissions: string[]; system?: boolean; staffCount?: number };

// ---- Customers --------------------------------------------------------------
export type Customer = {
  id: string;
  userId?: string;
  name?: string;
  phone?: string;
  email?: string;
  tier?: string;
  points?: number;
  ordersCount?: number;
  totalSpent?: Money;
  lastOrderAt?: string;
  marketing?: { email?: boolean; sms?: boolean; whatsapp?: boolean };
  createdAt?: string;
};

export type CustomerNote = { id: string; note: string; author?: string; at: string };
export type LoyaltyLedgerRow = { id: string; points: number; type: 'earned' | 'redeemed' | 'expired' | 'adjusted'; description?: string; at: string };
export type RewardRow = { id: string; name: string; pointsCost: number; redeemedAt?: string };

export type CustomerDetail = Customer & {
  orders?: { id: string; orderNumber: string; total: Money; status: string; at: string }[];
  loyalty?: { balance: number; tier?: string; lifetimePoints?: number };
  ledger?: LoyaltyLedgerRow[];
  rewards?: RewardRow[];
  favoriteProducts?: { id: string; name: string }[];
  favoriteBranches?: { id: string; name: string }[];
  notes?: CustomerNote[];
};

// ---- Tables -----------------------------------------------------------------
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'inactive';
export type RestaurantTable = {
  id: string;
  label: string;
  capacity: number;
  status: TableStatus;
  groupId?: string | null;
  groupName?: string;
  /** Floor-layout coordinates (0..1 fractions or px — backend-defined). */
  x?: number;
  y?: number;
  sessionId?: string | null;
};
export type TableGroup = { id: string; name: string; tableIds?: string[] };

// ---- QR ---------------------------------------------------------------------
export type QrCode = {
  id: string;
  code: string;
  type: 'table' | 'takeaway' | 'generic';
  tableId?: string | null;
  tableLabel?: string;
  active: boolean;
  url?: string;
  scans?: number;
  lastScanAt?: string;
  version?: number;
};

// ---- Coupons ----------------------------------------------------------------
export type CouponType = 'percentage' | 'fixed' | 'free_item' | 'bxgy';
export type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  /** percentage (bps or %) or fixed (Money) — displayed as backend provides. */
  value?: number;
  valueMoney?: Money | null;
  status: 'draft' | 'active' | 'scheduled' | 'archived' | 'expired';
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  usageCount?: number;
  perCustomerLimit?: number | null;
  conditions?: { minOrder?: Money; firstOrderOnly?: boolean; channels?: string[] };
  createdAt?: string;
};
export type CouponRedemption = { id: string; code: string; customerName?: string; orderNumber?: string; discount: Money; at: string };

// ---- Payments ---------------------------------------------------------------
export type PaymentProvider = 'razorpay' | 'phonepe' | 'cash';
export type PaymentRow = {
  id: string;
  orderNumber?: string;
  provider: PaymentProvider;
  method?: string;
  amount: Money;
  status: PaymentStatus;
  createdAt: string;
  refundedAmount?: Money | null;
};
export type RefundRow = { id: string; paymentId: string; orderNumber?: string; amount: Money; status: string; reason?: string; at: string };
export type SettlementRow = { id: string; provider: PaymentProvider; amount: Money; status: string; period?: string; at: string };
export type PaymentSummary = {
  captured: Money;
  refunded: Money;
  pending: Money;
  failedCount: number;
  byProvider: { provider: PaymentProvider; amount: Money; count: number }[];
};

// ---- Restaurant settings / branches -----------------------------------------
export type DayHours = { day: number; closed?: boolean; open?: string; close?: string };
export type TaxRate = { name: string; rate: number };

export type RestaurantProfile = {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  socials?: { instagram?: string; facebook?: string; x?: string };
  currency: string;
  timezone: string;
  gstNumber?: string;
  taxes?: TaxRate[];
  languages?: string[];
  serviceModes?: string[];
  hours?: DayHours[];
};

export type Branch = {
  id: string;
  name: string;
  slug?: string;
  address?: string;
  location?: GeoPoint | null;
  phone?: string;
  hours?: DayHours[];
  orderingStatus?: 'available' | 'busy' | 'unavailable' | 'closed';
  active: boolean;
  images?: { id: string; url: string }[];
};

// ---- Delivery zones (GeoJSON — backend serviceability) ----------------------
export type DeliveryZone = {
  id: string;
  name: string;
  priority?: number;
  mode: 'polygon' | 'radius';
  /** GeoJSON Polygon geometry (backend owns serviceability; the UI only edits it). */
  geojson?: { type: 'Polygon'; coordinates: number[][][] } | null;
  center?: GeoPoint | null;
  radiusMeters?: number | null;
  active: boolean;
};

// ---- Subscription -----------------------------------------------------------
export type Invoice = { id: string; number: string; amount: Money; status: string; at: string; url?: string };
export type Subscription = {
  plan: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled';
  trialEndsAt?: string | null;
  renewsAt?: string | null;
  limits?: { name: string; used: number; max: number | null }[];
  invoices?: Invoice[];
};

// ---- Notification preferences / security ------------------------------------
export type NotificationPreferences = {
  channels: { email?: boolean; sms?: boolean; whatsapp?: boolean; push?: boolean };
  categories: { order?: boolean; kitchen?: boolean; marketing?: boolean };
  sound?: boolean;
};

export type SecurityInfo = {
  sessions: StaffSession[];
  devices: StaffDevice[];
  loginHistory: AccessLog[];
};
