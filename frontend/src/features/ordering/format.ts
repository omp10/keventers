import type { Money, OrderStatus, PaymentStatus, VegClass } from './types';

/**
 * Presentation helpers. `formatMoney` renders the backend's Money DTO — it never
 * does arithmetic on amounts; it only formats the `major`/`currency` the backend
 * already computed.
 */
const SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };

export function formatMoney(m?: Money | null): string {
  if (!m) return '';
  const symbol = SYMBOLS[m.currency] ?? `${m.currency} `;
  const value = m.major.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(m.major) ? 0 : 2, maximumFractionDigits: 2 });
  return `${symbol}${value}`;
}

export function formatMinutes(mins?: number): string | null {
  if (mins == null) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export const VEG_PRESENTATION: Record<VegClass, { label: string; color: string }> = {
  veg: { label: 'Veg', color: 'text-success border-success' },
  non_veg: { label: 'Non-veg', color: 'text-danger border-danger' },
  egg: { label: 'Egg', color: 'text-warning border-warning' },
};

export const ORDER_STATUS_PRESENTATION: Record<OrderStatus, { label: string; tone: 'info' | 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  placed: { label: 'Order placed', tone: 'info' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  preparing: { label: 'Preparing', tone: 'primary' },
  ready: { label: 'Ready', tone: 'success' },
  served: { label: 'Served', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  refund_pending: { label: 'Refund pending', tone: 'warning' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

/** The customer-facing progression used by the tracking timeline. */
export const ORDER_PROGRESSION: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'ready', 'completed'];

export const PAYMENT_STATUS_PRESENTATION: Record<PaymentStatus, { label: string; tone: 'info' | 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  pending: { label: 'Payment pending', tone: 'warning' },
  processing: { label: 'Processing', tone: 'info' },
  authorized: { label: 'Authorized', tone: 'info' },
  captured: { label: 'Paid', tone: 'success' },
  failed: { label: 'Payment failed', tone: 'danger' },
  cancelled: { label: 'Payment cancelled', tone: 'neutral' },
};
