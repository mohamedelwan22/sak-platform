export function hasPermission(userPermissions: string[], permission: string): boolean {
  return userPermissions.includes(permission);
}

export function hasAnyPermission(userPermissions: string[], permissions: string[]): boolean {
  return permissions.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(userPermissions: string[], permissions: string[]): boolean {
  return permissions.every((p) => userPermissions.includes(p));
}

export function hasRole(userRole: string, roles: string[]): boolean {
  return roles.includes(userRole);
}

export function isAdmin(userRole: string): boolean {
  return userRole === "super_admin" || userRole === "admin";
}

export function isSuperAdmin(userRole: string): boolean {
  return userRole === "super_admin";
}

export function parsePermissionName(
  permissionName: string,
): { resource: string; action: string } | null {
  const parts = permissionName.split(".");
  if (parts.length !== 2) return null;
  return { resource: parts[0], action: parts[1] };
}

export function groupPermissionsByResource(permissions: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const perm of permissions) {
    const parsed = parsePermissionName(perm);
    if (parsed) {
      if (!grouped[parsed.resource]) {
        grouped[parsed.resource] = [];
      }
      grouped[parsed.resource].push(parsed.action);
    }
  }
  return grouped;
}
