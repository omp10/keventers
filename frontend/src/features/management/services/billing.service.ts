import { api, type Paginated } from '@/platform/api';
import type { Coupon, CouponRedemption, PaymentRow, PaymentSummary, RefundRow, SettlementRow } from '../types';

/**
 * COUPON SERVICE — consumes the backend Pricing module (coupons). The Pricing Engine
 * validates conditions + computes discounts; the UI only edits coupon definitions.
 */
export type CouponFilters = { q?: string; status?: string; type?: string };

class CouponService {
  list(filters: CouponFilters, page = 1, limit = 25): Promise<Paginated<Coupon>> {
    return api.paginate<Coupon>('/restaurant/coupons', { query: { ...filters, page, limit } });
  }
  get(id: string) {
    return api.get<Coupon>(`/restaurant/coupons/${id}`);
  }
  create(body: Partial<Coupon>) {
    return api.post<Coupon>('/restaurant/coupons', body);
  }
  update(id: string, patch: Partial<Coupon>) {
    return api.patch<Coupon>(`/restaurant/coupons/${id}`, patch);
  }
  archive(id: string) {
    return api.post<Coupon>(`/restaurant/coupons/${id}/archive`);
  }
  remove(id: string) {
    return api.delete<{ ok: true }>(`/restaurant/coupons/${id}`);
  }
  redemptions(id: string) {
    return api.list<CouponRedemption>(`/restaurant/coupons/${id}/redemptions`);
  }
  analytics(id: string) {
    return api.get<{ used: number; discountTotal: import('../types').Money; series?: { label: string; value: number }[] }>(`/restaurant/coupons/${id}/analytics`);
  }
}

/**
 * PAYMENTS SERVICE — consumes the backend Payment Engine. Read-only reporting
 * (history, refunds, settlements, provider breakdown). No amounts computed here.
 */
export type PaymentFilters = { q?: string; provider?: string; status?: string; from?: string };

class PaymentReportService {
  list(filters: PaymentFilters, page = 1, limit = 25): Promise<Paginated<PaymentRow>> {
    return api.paginate<PaymentRow>('/restaurant/payments', { query: { ...filters, page, limit } });
  }
  summary(filters?: PaymentFilters) {
    return api.get<PaymentSummary>('/restaurant/payments/summary', { query: filters });
  }
  refunds(page = 1, limit = 25): Promise<Paginated<RefundRow>> {
    return api.paginate<RefundRow>('/restaurant/refunds', { query: { page, limit } });
  }
  settlements(page = 1, limit = 25): Promise<Paginated<SettlementRow>> {
    return api.paginate<SettlementRow>('/restaurant/settlements', { query: { page, limit } });
  }
  exportUrl(filters: PaymentFilters) {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
    return `/restaurant/payments/export?${q.toString()}`;
  }
}

export const couponService = new CouponService();
export const paymentReportService = new PaymentReportService();
