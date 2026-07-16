import mongoose from 'mongoose';

import { INVOICE_STATUS } from '../constants/payment.constants.js';
import { baseSchemaOptions, moneyField, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

/**
 * Invoice: an IMMUTABLE financial document generated from the order's
 * Pricing-Engine snapshot. It captures restaurant/customer/item snapshots + the
 * tax/discount/service-charge/total breakdown so it never changes if the catalog
 * later changes. PDF generation is behind an interface (pdf.generator) — this
 * only stores the reference. Integer minor units.
 */
const invoiceSchema = new Schema(
  {
    ...tenantFields,
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true },
    invoiceNumber: { type: String, required: true },

    currency: { type: String, default: 'INR' },
    totalAmount: moneyField(0),

    /** Immutable snapshots (from the order). */
    restaurantSnapshot: { type: Schema.Types.Mixed, default: null },
    customerSnapshot: { type: Schema.Types.Mixed, default: null },
    items: { type: [Schema.Types.Mixed], default: [] },
    /** The Pricing-Engine breakdown (tax/discounts/serviceCharges/total). */
    pricing: { type: Schema.Types.Mixed, default: null },

    status: { type: String, enum: Object.values(INVOICE_STATUS), default: INVOICE_STATUS.ISSUED, index: true },

    /** PDF reference (generated via the PdfGenerator interface; may be null). */
    pdf: {
      generator: { type: String, default: null },
      key: { type: String, default: null },
      url: { type: String, default: null },
    },

    issuedAt: { type: Date, default: () => new Date() },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  baseSchemaOptions,
);

invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ orderId: 1 }, { unique: true });
invoiceSchema.index({ restaurantId: 1, createdAt: -1 });

export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

export default Invoice;
