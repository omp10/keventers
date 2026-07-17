/**
 * Response DTO mappers for the organization module. Explicit shaping keeps the
 * API surface stable and avoids leaking internal fields.
 */
const id = (doc) => (doc?._id ? String(doc._id) : (doc?.id ?? null));
const oid = (v) => (v ? String(v) : null);

export function toApplicationDTO(app) {
  if (!app) return null;
  return {
    id: id(app),
    restaurantName: app.restaurantName,
    brandName: app.brandName ?? '',
    ownerName: app.ownerName,
    email: app.email,
    phone: app.phone,
    gstNumber: app.gstNumber ?? '',
    fssaiLicense: app.fssaiLicense ?? '',
    businessRegistration: app.businessRegistration ?? '',
    address: app.address ?? null,
    restaurantType: app.restaurantType,
    cuisines: app.cuisines ?? [],
    numberOfBranches: app.numberOfBranches ?? 1,
    logo: app.logo ?? null,
    documents: app.documents ?? [],
    status: app.status,
    reviewNotes: app.reviewNotes ?? '',
    rejectionReason: app.rejectionReason ?? '',
    requestedInformation: app.requestedInformation ?? [],
    organizationId: oid(app.organizationId),
    submittedAt: app.submittedAt ?? null,
    reviewedAt: app.reviewedAt ?? null,
    createdAt: app.createdAt ?? null,
  };
}

export function toOrganizationDTO(org) {
  if (!org) return null;
  return {
    id: id(org),
    name: org.name,
    slug: org.slug,
    brandName: org.brandName ?? '',
    ownerUserId: oid(org.ownerUserId),
    status: org.status,
    contact: org.contact ?? null,
    subscription: org.subscription ?? null,
    settings: org.settings ?? null,
    createdAt: org.createdAt ?? null,
    updatedAt: org.updatedAt ?? null,
  };
}

export function toRestaurantDTO(restaurant) {
  if (!restaurant) return null;
  return {
    id: id(restaurant),
    organizationId: oid(restaurant.organizationId),
    name: restaurant.name,
    slug: restaurant.slug,
    type: restaurant.type,
    cuisines: restaurant.cuisines ?? [],
    address: restaurant.address ?? null,
    status: restaurant.status,
    settings: restaurant.settings ?? null,
    onboarding: restaurant.onboarding ?? null,
    managerUserId: oid(restaurant.managerUserId),
    createdAt: restaurant.createdAt ?? null,
    updatedAt: restaurant.updatedAt ?? null,
  };
}

export function toBranchDTO(branch) {
  if (!branch) return null;
  return {
    id: id(branch),
    organizationId: oid(branch.organizationId),
    restaurantId: oid(branch.restaurantId),
    name: branch.name,
    code: branch.code ?? '',
    /** The customer app addresses branches by slug (/r/:slug), so callers that
     *  resolve a branch need it to build a link back to the storefront. */
    slug: branch.slug ?? null,
    address: branch.address ?? null,
    businessHours: branch.businessHours ?? [],
    settings: branch.settings ?? null,
    managerUserId: oid(branch.managerUserId),
    isPrimary: Boolean(branch.isPrimary),
    status: branch.status,
    createdAt: branch.createdAt ?? null,
  };
}

export function toMembershipDTO(m) {
  if (!m) return null;
  return {
    id: id(m),
    userId: oid(m.userId),
    organizationId: oid(m.organizationId),
    restaurantId: oid(m.restaurantId),
    branchId: oid(m.branchId),
    scope: m.scope,
    role: m.role,
    isOwner: Boolean(m.isOwner),
    status: m.status,
  };
}

export function toSubscriptionDTO(org) {
  if (!org?.subscription) return null;
  return { organizationId: id(org), ...org.subscription };
}
