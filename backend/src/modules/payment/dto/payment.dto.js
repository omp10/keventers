/**
 * Payment DTO mappers. Monetary values are integer minor units. Credentials and
 * signing secrets are NEVER exposed — the config DTO returns only non-secret
 * fields plus a boolean indicating credentials are set.
 */
const id = (doc) => (doc?._id ? String(doc._id) : (doc?.id ?? null));
const oid = (v) => (v ? String(v) : null);

export function toIntentDTO(i) {
  if (!i) return null;
  return {
    id: id(i),
    orderId: oid(i.orderId),
    orderNumber: i.orderNumber,
    provider: i.provider,
    method: i.method ?? null,
    amount: i.amount,
    currency: i.currency,
    status: i.status,
    providerIntentRef: i.providerIntentRef ?? null,
    checkoutPayload: i.checkoutPayload ?? null,
    expiresAt: i.expiresAt ?? null,
    createdAt: i.createdAt ?? null,
  };
}

export function toPaymentDTO(p) {
  if (!p) return null;
  return {
    id: id(p),
    orderId: oid(p.orderId),
    orderNumber: p.orderNumber,
    intentId: oid(p.intentId),
    provider: p.provider,
    method: p.method ?? null,
    amount: p.amount,
    currency: p.currency,
    refundedAmount: p.refundedAmount ?? 0,
    status: p.status,
    providerPaymentRef: p.providerPaymentRef ?? null,
    failureReason: p.failureReason ?? null,
    customerUserId: oid(p.customerUserId),
    authorizedAt: p.authorizedAt ?? null,
    capturedAt: p.capturedAt ?? null,
    version: p.version ?? 0,
    createdAt: p.createdAt ?? null,
  };
}

export function toTransactionDTO(t) {
  if (!t) return null;
  return {
    id: id(t),
    internalTxnId: t.internalTxnId,
    providerTxnId: t.providerTxnId ?? null,
    gatewayReference: t.gatewayReference ?? null,
    orderId: oid(t.orderId),
    paymentId: oid(t.paymentId),
    type: t.type,
    amount: t.amount,
    currency: t.currency,
    provider: t.provider ?? null,
    status: t.status,
    failureReason: t.failureReason ?? null,
    createdAt: t.createdAt ?? null,
  };
}

export function toRefundDTO(r) {
  if (!r) return null;
  return {
    id: id(r),
    orderId: oid(r.orderId),
    paymentId: oid(r.paymentId),
    amount: r.amount,
    currency: r.currency,
    isPartial: Boolean(r.isPartial),
    provider: r.provider ?? null,
    providerRefundRef: r.providerRefundRef ?? null,
    status: r.status,
    reason: r.reason ?? '',
    failureReason: r.failureReason ?? null,
    completedAt: r.completedAt ?? null,
    createdAt: r.createdAt ?? null,
  };
}

export function toInvoiceDTO(v) {
  if (!v) return null;
  return {
    id: id(v),
    invoiceNumber: v.invoiceNumber,
    orderId: oid(v.orderId),
    orderNumber: v.orderNumber,
    currency: v.currency,
    totalAmount: v.totalAmount,
    restaurant: v.restaurantSnapshot ?? null,
    customer: v.customerSnapshot ?? null,
    items: v.items ?? [],
    pricing: v.pricing ?? null,
    status: v.status,
    pdf: v.pdf ?? null,
    issuedAt: v.issuedAt ?? null,
  };
}

export function toSettlementDTO(s) {
  if (!s) return null;
  return {
    id: id(s),
    restaurantId: oid(s.restaurantId),
    provider: s.provider ?? null,
    periodStart: s.periodStart ?? null,
    periodEnd: s.periodEnd ?? null,
    grossAmount: s.grossAmount,
    commissionAmount: s.commissionAmount,
    taxAmount: s.taxAmount,
    netAmount: s.netAmount,
    currency: s.currency,
    paymentCount: s.paymentCount ?? 0,
    status: s.status,
    completedAt: s.completedAt ?? null,
    createdAt: s.createdAt ?? null,
  };
}

/** Config DTO — NEVER exposes secrets, only whether they are configured. */
export function toConfigDTO(c) {
  if (!c) return null;
  return {
    id: id(c),
    organizationId: oid(c.organizationId),
    restaurantId: oid(c.restaurantId),
    provider: c.provider,
    environment: c.environment,
    enabledMethods: c.enabledMethods ?? [],
    isActive: c.isActive !== false,
    isDefault: Boolean(c.isDefault),
    credentialsConfigured: Boolean(c.secretKeyEnc || c.merchantIdEnc),
    createdAt: c.createdAt ?? null,
  };
}
