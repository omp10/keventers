/**
 * Slug generation. Produces a URL-safe, lowercase slug; the caller ensures
 * uniqueness (appending a short suffix on collision).
 */
export function slugify(input) {
  return String(input ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'org';
}

/**
 * Generate a unique slug given an existence checker.
 * @param {string} base
 * @param {(slug: string) => Promise<boolean>} exists
 * @param {(n: number) => string} suffix  Deterministic suffix by attempt index.
 */
export async function uniqueSlug(base, exists, suffix = (n) => `-${n + 1}`) {
  const root = slugify(base);
  if (!(await exists(root))) return root;
  for (let i = 1; i < 50; i += 1) {
    const candidate = `${root}${suffix(i)}`;
    if (!(await exists(candidate))) return candidate;
  }
  // Extremely unlikely; fall back to a timestamped-free counter-based value.
  return `${root}-${Math.floor(50 + root.length)}`;
}
