import { BaseService } from '#core/service/base.service.js';

import { toInvoiceDTO } from '../dto/payment.dto.js';
import { InvoiceGeneratedEvent } from '../events/payment.events.js';
import { noopPdfGenerator } from '../interfaces/extension-points.interface.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { entityId } from '../utils/id.util.js';
import { invoiceNumber } from '../utils/reference.util.js';
import { loadForStaff, resolveStaffScope } from '../utils/tenant.util.js';

/**
 * Invoice generation. Produces an IMMUTABLE invoice from the order's
 * Pricing-Engine snapshot (restaurant/customer/item snapshots + tax/discounts/
 * service-charges/total) — it NEVER recomputes money. One invoice per order
 * (idempotent). PDF rendering is delegated to the PdfGenerator interface (a
 * no-op by default; a real generator is injected via DI).
 */
export class InvoiceService extends BaseService {
  constructor({ invoices = invoiceRepository, pdf = noopPdfGenerator, resolveScope = resolveStaffScope, eventBus } = {}) {
    super({ name: 'payment.invoice', eventBus });
    this.invoices = invoices;
    this.pdf = pdf;
    this.resolveScope = resolveScope;
  }

  /** Generate (once) the invoice for a fully-paid order. */
  async generateForOrder(order) {
    const existing = await this.invoices.findByOrder(order.id ?? order._id);
    if (existing) return toInvoiceDTO(existing);

    const scope = {
      organizationId: String(order.organizationId),
      restaurantId: String(order.restaurantId),
      branchId: String(order.branchId),
    };
    let invoice;
    try {
      invoice = await this.invoices.createScoped(scope, {
        orderId: order.id ?? order._id,
        orderNumber: order.orderNumber,
        invoiceNumber: invoiceNumber(order.orderNumber),
        currency: order.currency ?? 'INR',
        totalAmount: order.pricing?.total?.amount ?? 0,
        restaurantSnapshot: order.snapshots?.restaurant ?? null,
        customerSnapshot: order.snapshots?.customer ?? null,
        items: order.items ?? [],
        pricing: order.pricing ?? null, // immutable Pricing-Engine breakdown
      });
    } catch (err) {
      if (err?.code === 11000) {
        const dup = await this.invoices.findByOrder(order.id ?? order._id);
        if (dup) return toInvoiceDTO(dup);
      }
      throw err;
    }

    // PDF is best-effort via the interface.
    try {
      const ref = await this.pdf.generate(invoice);
      if (ref?.key || ref?.url) {
        invoice = await this.invoices.updateById(entityId(invoice), { pdf: { generator: 'default', key: ref.key ?? null, url: ref.url ?? null } });
      }
    } catch (err) {
      this.logger.warn({ err }, 'Invoice PDF generation failed (continuing)');
    }

    await this.events.publish(
      new InvoiceGeneratedEvent({ invoiceId: entityId(invoice), orderId: String(order.id ?? order._id), invoiceNumber: invoice.invoiceNumber, restaurantId: scope.restaurantId }),
    );
    this.audit.success('payment.invoice.generated', { targetId: entityId(invoice), metadata: { orderId: String(order.id ?? order._id) } });
    return toInvoiceDTO(invoice);
  }

  async getForStaff(tenant, id) {
    const invoice = await loadForStaff(this.invoices, tenant, id, 'Invoice not found');
    return toInvoiceDTO(invoice);
  }

  async listForStaff(tenant, restaurantId, branchId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId, branchId);
    const filter = {};
    if (query.status) filter.status = query.status;
    const page = await this.invoices.paginateForStaff(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toInvoiceDTO);
  }
}

export const invoiceService = new InvoiceService();
export default invoiceService;
