/**
 * Slug generation for catalog entities (menus, categories, products). Produces
 * a URL-safe, lowercase slug; the caller ensures uniqueness within the tenant
 * (restaurant) scope by appending a short suffix on collision.
 */
export function slugify(input, fallback = 'item') {
  return (
    String(input ?? '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || fallback
  );
}

/**
 * Generate a slug unique within a tenant scope given an existence checker.
 * @param {string} base
 * @param {(slug: string) => Promise<boolean>} exists  Scoped existence check.
 * @param {string} [fallback]
 * @returns {Promise<string>}
 */
export async function uniqueSlug(base, exists, fallback = 'item') {
  const root = slugify(base, fallback);
  if (!(await exists(root))) return root;
  for (let i = 1; i < 100; i += 1) {
    const candidate = `${root}-${i + 1}`;
    if (!(await exists(candidate))) return candidate;
  }
  // Deterministic, collision-free-enough fallback (no Date.now in this sandbox).
  return `${root}-${root.length + 100}`;
}
