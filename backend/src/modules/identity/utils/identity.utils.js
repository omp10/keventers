/**
 * Identity helper utilities (pure / data-shaping). No MongoDB access here —
 * repositories are passed in.
 */

/**
 * Resolve a user's EFFECTIVE permissions = union of the permissions granted by
 * each of their roles (loaded in ONE batched query) plus their direct
 * permissions. These are embedded into the JWT/session so authorization needs
 * no further lookups per request.
 *
 * @param {import('../repositories/role.repository.js').RoleRepository} roleRepository
 * @param {string[]} roleNames
 * @param {string[]} [directPermissions]
 * @returns {Promise<string[]>}
 */
export async function resolveEffectivePermissions(roleRepository, roleNames = [], directPermissions = []) {
  const set = new Set(directPermissions);
  if (roleNames.length > 0) {
    const roles = await roleRepository.findByNames(roleNames);
    for (const role of roles) {
      for (const perm of role.permissions ?? []) set.add(perm);
    }
  }
  return [...set];
}

/** Deduplicate + normalize a list of names to lowercase. */
export function normalizeNames(names = []) {
  return [...new Set(names.map((n) => String(n).trim().toLowerCase()).filter(Boolean))];
}

/** Build the identity descriptor consumed by the session service. */
export function buildSessionIdentity(user, effectivePermissions) {
  return {
    userId: String(user._id ?? user.id),
    roles: user.roles ?? [],
    permissions: effectivePermissions,
    meta: { email: user.email, type: user.type },
  };
}
