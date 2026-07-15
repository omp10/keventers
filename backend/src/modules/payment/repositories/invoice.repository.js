import { Invoice } from '../models/invoice.model.js';

import { PaymentScopedRepository } from './payment-scoped.repository.js';

export class InvoiceRepository extends PaymentScopedRepository {
  constructor(model = Invoice) {
    super(model, { softDelete: false, searchableFields: ['invoiceNumber', 'orderNumber'] });
  }

  findByOrder(orderId) {
    return this.findOne({ orderId });
  }

  findByNumber(invoiceNumber) {
    return this.findOne({ invoiceNumber });
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['status', 'orderId'] });
  }
}

export const invoiceRepository = new InvoiceRepository();
export default invoiceRepository;
