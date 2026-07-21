import type {
  Money,
  Order,
  OrderChannel,
  OrderStatus,
  PaymentStatus,
} from '@/features/ordering';

/**
 * RESTAURANT (staff) DOMAIN TYPES. Reuses the ordering domain (Order/Money/status)
 * so the same Money DTOs + statuses flow through — the dashboard renders backend
 * values and NEVER computes prices, counts, or rates (analytics are authoritative).
 */
export type { Money, Order, OrderStatus, OrderChannel, PaymentStatus } from '@/features/ordering';

export type StaffBranch = { id: string; name: string; slug?: string };
export type StaffContext = {
  restaurantId: string;
  restaurantName: string;
  branchId?: string;
  branchName?: string;
  branches?: StaffBranch[];
  /** Socket room(s) to join for live events (backend-provided). */
  rooms?: string[];
};

export type OrderPriority = 'normal' | 'rush' | 'vip';

/** Lightweight order row for boards/lists (backend list projection). */
export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  channel?: OrderChannel;
  customerName?: string;
  tableLabel?: string;
  itemCount: number;
  total: Money;
  paymentStatus: PaymentStatus;
  createdAt: string;
  prepMinutes?: number;
  priority?: OrderPriority;
  scheduledAt?: string | null;
  slaBreached?: boolean;
};

export type AuditEvent = { id: string; type: string; actor?: string; message: string; at: string };

/** Full staff order detail (adds operational context to the customer Order). */
/** One sitting's consolidated bill: every order the table placed, plus totals.
 *  All money is MINOR units (paise). */
export type SessionBill = {
  sessionId: string | null;
  table?: { id: string; number?: string | number | null; name?: string | null } | null;
  orderCount: number;
  billableCount: number;
  currency: string;
  openedAt?: string | null;
  orders: StaffOrderDetail[];
  totals: {
    subtotal: number;
    discount: number;
    taxes: { label: string; amount: number }[];
    taxTotal: number;
    serviceCharge: number;
    charges?: number;
    total: number;
    paid: number;
    due: number;
  };
};

export type StaffOrderDetail = Order & {
  customer?: { id?: string; name?: string; phone?: string } | null;
  guestSessionId?: string;
  table?: { label?: string; code?: string } | null;
  qrCode?: string;
  priority?: OrderPriority;
  kitchen?: { status?: string; station?: string; slaBreached?: boolean; prepMinutes?: number } | null;
  auditEvents?: AuditEvent[];
};

// ---- Dashboard / analytics --------------------------------------------------
export type DashboardMetrics = {
  revenue: Money;
  revenueDeltaPct?: number;
  orders: number;
  ordersDeltaPct?: number;
  live: number;
  preparing: number;
  completed: number;
  cancelled: number;
  avgOrderValue: Money;
  avgPrepMinutes?: number;
  kitchenSla?: { onTimeRate: number; breachedCount: number };
};

export type SeriesPoint = { label: string; value: number };
export type HourlyPoint = { hour: string; orders: number };
export type TopProduct = { id: string; name: string; quantity: number; revenue: Money };

export type ActivityItem = {
  id: string;
  type: 'order' | 'payment' | 'kitchen' | 'system';
  title: string;
  description?: string;
  at: string;
  orderId?: string;
  level?: 'info' | 'success' | 'warning' | 'danger';
};

export type AnalyticsOverview = {
  revenue: Money;
  orders: number;
  avgTicket: Money;
  avgPrepMinutes?: number;
  completionRate: number;
  cancellationRate: number;
  customerCount: number;
  peakHours?: HourlyPoint[];
  bestSellers?: TopProduct[];
  revenueSeries?: SeriesPoint[];
};

/** Board buckets — the operational grouping of order statuses. */
export type OrderBucketKey = 'incoming' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export const ORDER_BUCKETS: { key: OrderBucketKey; label: string; statuses: OrderStatus[] }[] = [
  { key: 'incoming', label: 'Incoming', statuses: ['placed'] },
  { key: 'accepted', label: 'Accepted', statuses: ['confirmed'] },
  { key: 'preparing', label: 'Preparing', statuses: ['preparing'] },
  { key: 'ready', label: 'Ready', statuses: ['ready', 'served'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled', 'refund_pending', 'refunded'] },
];

/** The staff action verbs that advance an order (mapped to backend transitions). */
export type OrderAction = 'confirm' | 'start' | 'ready' | 'serve' | 'complete' | 'cancel';
