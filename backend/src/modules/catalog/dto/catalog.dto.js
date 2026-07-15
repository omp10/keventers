/**
 * Response DTO mappers for the catalog module. Explicit shaping keeps the API
 * surface stable, strips internal fields (deletedAt, __v) and never leaks
 * Mongoose types. Every future ordering module consumes these shapes.
 */
const id = (doc) => (doc?._id ? String(doc._id) : (doc?.id ?? null));
const oid = (v) => (v ? String(v) : null);
const oids = (arr) => (Array.isArray(arr) ? arr.map((v) => String(v)) : []);

export function toMenuDTO(menu) {
  if (!menu) return null;
  return {
    id: id(menu),
    organizationId: oid(menu.organizationId),
    restaurantId: oid(menu.restaurantId),
    name: menu.name,
    slug: menu.slug,
    description: menu.description ?? '',
    type: menu.type,
    status: menu.status,
    visibility: menu.visibility,
    isActive: Boolean(menu.isActive),
    isDefault: Boolean(menu.isDefault),
    schedule: menu.schedule ?? null,
    imageUrl: menu.imageUrl ?? null,
    displayOrder: menu.displayOrder ?? 0,
    version: menu.version ?? 1,
    publishedAt: menu.publishedAt ?? null,
    createdAt: menu.createdAt ?? null,
    updatedAt: menu.updatedAt ?? null,
  };
}

export function toCategoryDTO(category) {
  if (!category) return null;
  return {
    id: id(category),
    organizationId: oid(category.organizationId),
    restaurantId: oid(category.restaurantId),
    menuId: oid(category.menuId),
    parentId: oid(category.parentId),
    depth: category.depth ?? 0,
    isSubcategory: Boolean(category.parentId),
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    imageUrl: category.imageUrl ?? null,
    iconUrl: category.iconUrl ?? null,
    status: category.status,
    isFeatured: Boolean(category.isFeatured),
    displayOrder: category.displayOrder ?? 0,
    createdAt: category.createdAt ?? null,
    updatedAt: category.updatedAt ?? null,
  };
}

/** A category with its subcategories nested (used by tree endpoints). */
export function toCategoryTreeDTO(category, children = []) {
  const dto = toCategoryDTO(category);
  if (!dto) return null;
  return { ...dto, subcategories: children.map((c) => toCategoryDTO(c)) };
}

export function toVariantDTO(variant) {
  if (!variant) return null;
  return {
    id: id(variant),
    organizationId: oid(variant.organizationId),
    restaurantId: oid(variant.restaurantId),
    productId: oid(variant.productId),
    name: variant.name,
    sku: variant.sku ?? null,
    price: variant.price ?? 0,
    compareAtPrice: variant.compareAtPrice ?? null,
    isAvailable: variant.isAvailable !== false,
    preparationTimeMinutes: variant.preparationTimeMinutes ?? null,
    isDefault: Boolean(variant.isDefault),
    displayOrder: variant.displayOrder ?? 0,
    status: variant.status,
    createdAt: variant.createdAt ?? null,
  };
}

export function toModifierDTO(modifier) {
  if (!modifier) return null;
  return {
    id: id(modifier),
    organizationId: oid(modifier.organizationId),
    restaurantId: oid(modifier.restaurantId),
    groupId: oid(modifier.groupId),
    name: modifier.name,
    price: modifier.price ?? 0,
    calories: modifier.calories ?? null,
    isDefault: Boolean(modifier.isDefault),
    isAvailable: modifier.isAvailable !== false,
    displayOrder: modifier.displayOrder ?? 0,
    status: modifier.status,
  };
}

export function toModifierGroupDTO(group, modifiers = []) {
  if (!group) return null;
  return {
    id: id(group),
    organizationId: oid(group.organizationId),
    restaurantId: oid(group.restaurantId),
    name: group.name,
    description: group.description ?? '',
    type: group.type,
    isRequired: Boolean(group.isRequired),
    minSelection: group.minSelection ?? 0,
    maxSelection: group.maxSelection ?? null,
    displayOrder: group.displayOrder ?? 0,
    status: group.status,
    modifiers: modifiers.map((m) => toModifierDTO(m)),
    createdAt: group.createdAt ?? null,
  };
}

export function toAddonDTO(addon) {
  if (!addon) return null;
  return {
    id: id(addon),
    organizationId: oid(addon.organizationId),
    restaurantId: oid(addon.restaurantId),
    name: addon.name,
    description: addon.description ?? '',
    price: addon.price ?? 0,
    calories: addon.calories ?? null,
    imageUrl: addon.imageUrl ?? null,
    isAvailable: addon.isAvailable !== false,
    displayOrder: addon.displayOrder ?? 0,
    status: addon.status,
    createdAt: addon.createdAt ?? null,
  };
}

export function toProductDTO(product) {
  if (!product) return null;
  return {
    id: id(product),
    organizationId: oid(product.organizationId),
    restaurantId: oid(product.restaurantId),
    categoryId: oid(product.categoryId),
    rootCategoryId: oid(product.rootCategoryId),
    menuIds: oids(product.menuIds),
    name: product.name,
    slug: product.slug,
    description: product.description ?? '',
    shortDescription: product.shortDescription ?? '',
    sku: product.sku ?? null,
    images: product.images ?? [],
    thumbnailUrl: product.thumbnailUrl ?? null,
    heroImageUrl: product.heroImageUrl ?? null,
    pricing: product.pricing ?? null,
    taxCategory: product.taxCategory ?? 'standard',
    preparationTimeMinutes: product.preparationTimeMinutes ?? 0,
    dietaryTags: product.dietaryTags ?? [],
    allergens: product.allergens ?? [],
    spiceLevel: product.spiceLevel ?? 'none',
    nutrition: product.nutrition ?? null,
    tags: product.tags ?? [],
    modifierGroupIds: oids(product.modifierGroupIds),
    addonIds: oids(product.addonIds),
    hasVariants: Boolean(product.hasVariants),
    availability: product.availability ?? null,
    status: product.status,
    isFeatured: Boolean(product.isFeatured),
    isPopular: Boolean(product.isPopular),
    isRecommended: Boolean(product.isRecommended),
    displayOrder: product.displayOrder ?? 0,
    trackInventory: Boolean(product.trackInventory),
    createdAt: product.createdAt ?? null,
    updatedAt: product.updatedAt ?? null,
  };
}

/** Full product detail: base DTO plus resolved variants/modifier groups/add-ons. */
export function toProductDetailDTO(product, { variants = [], modifierGroups = [], addons = [] } = {}) {
  const dto = toProductDTO(product);
  if (!dto) return null;
  return {
    ...dto,
    variants: variants.map((v) => toVariantDTO(v)),
    modifierGroups: modifierGroups.map((g) => toModifierGroupDTO(g.group ?? g, g.modifiers ?? [])),
    addons: addons.map((a) => toAddonDTO(a)),
  };
}

export function toProductAvailabilityDTO(row) {
  if (!row) return null;
  return {
    id: id(row),
    restaurantId: oid(row.restaurantId),
    branchId: oid(row.branchId),
    productId: oid(row.productId),
    variantId: oid(row.variantId),
    status: row.status,
    isAvailable: row.isAvailable !== false,
    windows: row.windows ?? [],
    overrideFrom: row.overrideFrom ?? null,
    overrideUntil: row.overrideUntil ?? null,
    reason: row.reason ?? '',
  };
}
