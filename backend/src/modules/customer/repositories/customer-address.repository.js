import { CustomerAddress } from '../models/customer-address.model.js';

import { CustomerScopedRepository } from './customer-scoped.repository.js';

/** Customer address repository (restaurant-scoped, per-customer soft delete). */
export class CustomerAddressRepository extends CustomerScopedRepository {
  constructor(model = CustomerAddress) {
    super(model, { softDelete: true, searchableFields: ['label', 'line1', 'city'] });
  }

  findForCustomer(customerId) {
    return this.find({ customerId, deletedAt: null }, { sort: '-isDefault -createdAt' });
  }

  /** Clear the default flag on all of a customer's addresses (before setting a new one). */
  async clearDefaults(customerId) {
    await this.model.updateMany({ customerId, isDefault: true }, { $set: { isDefault: false } });
  }
}

export const customerAddressRepository = new CustomerAddressRepository();
export default customerAddressRepository;
