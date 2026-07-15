/**
 * Response DTO mappers. Services/controllers return these so the API surface is
 * explicit and secrets (passwordHash) never leak — regardless of what the
 * repository selected.
 */
function id(doc) {
  return doc?._id ? String(doc._id) : (doc?.id ?? null);
}

export function toUserDTO(user) {
  if (!user) return null;
  return {
    id: id(user),
    email: user.email,
    phone: user.phone ?? null,
    firstName: user.firstName,
    lastName: user.lastName ?? '',
    fullName: user.fullName ?? [user.firstName, user.lastName].filter(Boolean).join(' '),
    roles: user.roles ?? [],
    permissions: user.permissions ?? [],
    status: user.status,
    type: user.type,
    emailVerified: Boolean(user.emailVerified),
    profile: user.profile
      ? {
          avatarUrl: user.profile.avatarUrl ?? null,
          dateOfBirth: user.profile.dateOfBirth ?? null,
          gender: user.profile.gender ?? 'unspecified',
          bio: user.profile.bio ?? '',
        }
      : null,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
  };
}

export function toRoleDTO(role) {
  if (!role) return null;
  return {
    id: id(role),
    name: role.name,
    displayName: role.displayName ?? '',
    description: role.description ?? '',
    permissions: role.permissions ?? [],
    isSystem: Boolean(role.isSystem),
    priority: role.priority ?? 0,
    createdAt: role.createdAt ?? null,
    updatedAt: role.updatedAt ?? null,
  };
}

export function toPermissionDTO(permission) {
  if (!permission) return null;
  return {
    id: id(permission),
    name: permission.name,
    resource: permission.resource,
    action: permission.action,
    description: permission.description ?? '',
    isSystem: Boolean(permission.isSystem),
    createdAt: permission.createdAt ?? null,
  };
}

export function toStaffDTO(staff) {
  if (!staff) return null;
  return {
    id: id(staff),
    userId: staff.userId ? String(staff.userId) : null,
    employeeId: staff.employeeId,
    designation: staff.designation ?? '',
    department: staff.department ?? '',
    reportsTo: staff.reportsTo ? String(staff.reportsTo) : null,
    joinedAt: staff.joinedAt ?? null,
    status: staff.status,
    createdAt: staff.createdAt ?? null,
  };
}

/** Token pair + user summary returned by auth endpoints. */
export function toAuthDTO({ user, tokens, sessionId }) {
  return {
    user: toUserDTO(user),
    session: { id: sessionId },
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
    },
  };
}
