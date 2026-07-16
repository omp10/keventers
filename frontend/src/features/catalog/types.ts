import type { Money, VegClass } from '@/features/ordering';

/**
 * CATALOG DOMAIN TYPES (Phase F4.2). Reuses the ordering Money/VegClass so the same
 * Money DTOs flow through — the catalog UI edits DRAFTS and sends them to the
 * backend Catalog module, which owns all business rules (pricing math, availability
 * resolution, publish state machine). The frontend never enforces those rules.
 */
export type { Money, VegClass } from '@/features/ordering';

/** Lifecycle state — owned by the backend; the frontend only reflects it. */
export type CatalogStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export type AvailabilityState = 'available' | 'unavailable' | 'scheduled';

export type Schedule = {
  startAt?: string | null;
  endAt?: string | null;
  /** Weekday numbers 0-6 (backend interprets). */
  days?: number[];
  from?: string;
  to?: string;
};

export type BranchAvailabilityOverride = { branchId: string; branchName?: string; state: AvailabilityState };

export type Availability = {
  state: AvailabilityState;
  schedule?: Schedule | null;
  branchOverrides?: BranchAvailabilityOverride[];
};

export type MediaImage = { id: string; url: string; alt?: string; publicId?: string; order?: number };

// ---- Menu -------------------------------------------------------------------
export type Menu = {
  id: string;
  name: string;
  description?: string;
  status: CatalogStatus;
  active: boolean;
  schedule?: Schedule | null;
  categoryCount?: number;
  productCount?: number;
  updatedAt?: string;
};

// ---- Category ---------------------------------------------------------------
export type Category = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  order: number;
  image?: MediaImage | null;
  icon?: string;
  visible: boolean;
  availability?: Availability;
  status: CatalogStatus;
  productCount?: number;
  children?: Category[];
  updatedAt?: string;
};

// ---- Variants / Modifiers / Add-ons -----------------------------------------
export type VariantDraft = {
  id: string;
  name: string;
  price: Money;
  sku?: string;
  available: boolean;
  prepTimeMinutes?: number;
  order?: number;
};

export type ModifierDraft = {
  id: string;
  name: string;
  price: Money;
  available: boolean;
  order?: number;
};

export type ModifierGroupDraft = {
  id: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  order?: number;
  modifiers: ModifierDraft[];
  /** How many products reference this group (shared groups). */
  usageCount?: number;
  status?: CatalogStatus;
};

export type AddonDraft = {
  id: string;
  name: string;
  price: Money;
  available: boolean;
  group?: string;
  order?: number;
  status?: CatalogStatus;
};

// ---- Product ----------------------------------------------------------------
export type CatalogProduct = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  price: Money;
  discountedPrice?: Money | null;
  images: MediaImage[];
  veg?: VegClass;
  featured?: boolean;
  popular?: boolean;
  prepTimeMinutes?: number;
  /** Calories placeholder (future nutrition module). */
  calories?: number;
  tags?: string[];
  variants?: VariantDraft[];
  modifierGroups?: ModifierGroupDraft[];
  addons?: AddonDraft[];
  availability: Availability;
  status: CatalogStatus;
  /** SEO placeholder (future). */
  seo?: { title?: string; description?: string };
  updatedAt?: string;
};

// ---- Filters / queries ------------------------------------------------------
export type CatalogSort = 'recent' | 'name' | 'price_asc' | 'price_desc';

export type ProductFilters = {
  q?: string;
  categoryId?: string;
  status?: CatalogStatus[];
  availability?: AvailabilityState[];
  veg?: VegClass[];
  featured?: boolean;
  popular?: boolean;
  sort?: CatalogSort;
};

/** A generic catalog entity for bulk operations across types. */
export type CatalogEntityType = 'menu' | 'category' | 'product' | 'variant' | 'modifierGroup' | 'addon';
