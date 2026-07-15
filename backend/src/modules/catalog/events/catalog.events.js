import { DomainEvent } from '#core/eventbus/index.js';

/**
 * Catalog domain events. Published on every state change so future modules
 * (KDS, inventory, analytics, customer app, cache-warmers) can react WITHOUT
 * coupling to the catalog internals. Names are stable + past-tense.
 */
export const CATALOG_EVENTS = Object.freeze({
  // Menu
  MENU_CREATED: 'catalog.menu.created',
  MENU_UPDATED: 'catalog.menu.updated',
  MENU_DELETED: 'catalog.menu.deleted',
  MENU_PUBLISHED: 'catalog.menu.published',
  MENU_ARCHIVED: 'catalog.menu.archived',
  // Category
  CATEGORY_CREATED: 'catalog.category.created',
  CATEGORY_UPDATED: 'catalog.category.updated',
  CATEGORY_DELETED: 'catalog.category.deleted',
  // Product
  PRODUCT_CREATED: 'catalog.product.created',
  PRODUCT_UPDATED: 'catalog.product.updated',
  PRODUCT_DELETED: 'catalog.product.deleted',
  PRODUCT_AVAILABILITY_CHANGED: 'catalog.product.availability_changed',
  PRODUCT_PRICE_CHANGED: 'catalog.product.price_changed',
  // Variant
  VARIANT_CREATED: 'catalog.variant.created',
  VARIANT_UPDATED: 'catalog.variant.updated',
  VARIANT_DELETED: 'catalog.variant.deleted',
  // Modifier
  MODIFIER_GROUP_CREATED: 'catalog.modifier_group.created',
  MODIFIER_GROUP_UPDATED: 'catalog.modifier_group.updated',
  MODIFIER_GROUP_DELETED: 'catalog.modifier_group.deleted',
  MODIFIER_ADDED: 'catalog.modifier.added',
  MODIFIER_UPDATED: 'catalog.modifier.updated',
  MODIFIER_REMOVED: 'catalog.modifier.removed',
  // Add-on
  ADDON_CREATED: 'catalog.addon.created',
  ADDON_UPDATED: 'catalog.addon.updated',
  ADDON_DELETED: 'catalog.addon.deleted',
  // Inventory hooks (extension points — NO inventory logic this phase)
  INVENTORY_LOW: 'catalog.inventory.low',
  INVENTORY_UPDATED: 'catalog.inventory.updated',
  INVENTORY_UNAVAILABLE: 'catalog.inventory.unavailable',
  PRODUCT_STOCK_CHANGED: 'catalog.product.stock_changed',
});

// --- Menu ---
export class MenuCreatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.MENU_CREATED;
}
export class MenuUpdatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.MENU_UPDATED;
}
export class MenuDeletedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.MENU_DELETED;
}
export class MenuPublishedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.MENU_PUBLISHED;
}
export class MenuArchivedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.MENU_ARCHIVED;
}

// --- Category ---
export class CategoryCreatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.CATEGORY_CREATED;
}
export class CategoryUpdatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.CATEGORY_UPDATED;
}
export class CategoryDeletedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.CATEGORY_DELETED;
}

// --- Product ---
export class ProductCreatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.PRODUCT_CREATED;
}
export class ProductUpdatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.PRODUCT_UPDATED;
}
export class ProductDeletedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.PRODUCT_DELETED;
}
export class ProductAvailabilityChangedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.PRODUCT_AVAILABILITY_CHANGED;
}
export class ProductPriceChangedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.PRODUCT_PRICE_CHANGED;
}

// --- Variant ---
export class VariantCreatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.VARIANT_CREATED;
}
export class VariantUpdatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.VARIANT_UPDATED;
}
export class VariantDeletedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.VARIANT_DELETED;
}

// --- Modifier ---
export class ModifierGroupCreatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.MODIFIER_GROUP_CREATED;
}
export class ModifierGroupUpdatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.MODIFIER_GROUP_UPDATED;
}
export class ModifierGroupDeletedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.MODIFIER_GROUP_DELETED;
}
export class ModifierAddedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.MODIFIER_ADDED;
}
export class ModifierUpdatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.MODIFIER_UPDATED;
}
export class ModifierRemovedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.MODIFIER_REMOVED;
}

// --- Add-on ---
export class AddonCreatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.ADDON_CREATED;
}
export class AddonUpdatedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.ADDON_UPDATED;
}
export class AddonDeletedEvent extends DomainEvent {
  static eventName = CATALOG_EVENTS.ADDON_DELETED;
}
