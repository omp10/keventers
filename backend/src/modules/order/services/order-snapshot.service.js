import { BaseService } from '#core/service/base.service.js';

/**
 * Order snapshot builder. Captures IMMUTABLE copies of everything an order must
 * preserve for historical accuracy — restaurant, branch, session, customer, and
 * the frozen line items — so future catalog / restaurant changes never affect a
 * placed order. Prices are NOT computed here (the order consumes the Pricing
 * Engine breakdown captured on the locked cart); this only shapes snapshots.
 */
export class OrderSnapshotService extends BaseService {
  constructor({ eventBus } = {}) {
    super({ name: 'order.snapshot', eventBus });
  }

  /** Business snapshots (restaurant / branch / session / optional customer). */
  buildSnapshots({ scope, restaurant, branch, session }) {
    return {
      restaurant: restaurant
        ? {
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
            type: restaurant.type,
            currency: restaurant.settings?.currency ?? 'INR',
            timezone: restaurant.settings?.timezone ?? 'Asia/Kolkata',
            tax: restaurant.settings?.tax ?? null,
            branding: restaurant.settings?.branding ?? null,
          }
        : null,
      branch: branch
        ? { id: branch.id, name: branch.name, address: branch.address ?? null }
        : null,
      session: {
        sessionId: scope.sessionId,
        guestId: scope.guestId,
        identityType: session?.identityType ?? 'anonymous',
        tableId: scope.tableId,
      },
      customer: scope.customerUserId ? { userId: scope.customerUserId } : null,
    };
  }

  /** Freeze cart lines into order items (already priced by the engine). */
  buildItems(cart) {
    return (cart.items ?? []).map((it) => ({
      productId: it.productId,
      productSnapshot: it.product ?? {},
      variantId: it.variantId ?? null,
      variantSnapshot: it.variant ?? { name: '' },
      modifiers: (it.modifiers ?? []).map((m) => ({
        groupId: m.groupId,
        groupName: m.groupName,
        modifierId: m.modifierId,
        name: m.name,
        unitPrice: m.unitPrice,
      })),
      addons: (it.addons ?? []).map((a) => ({ addonId: a.addonId, name: a.name, unitPrice: a.unitPrice })),
      quantity: it.quantity,
      specialInstructions: it.specialInstructions ?? '',
      notes: it.notes ?? '',
      pricing: it.pricing ?? {},
      lineSubtotal: it.lineSubtotal ?? 0,
    }));
  }
}

export const orderSnapshotService = new OrderSnapshotService();
export default orderSnapshotService;
