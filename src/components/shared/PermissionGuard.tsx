import type { ReactNode } from "react";
import { usePermissions, useRole } from "@/hooks/usePermissions";

interface PermissionGuardProps {
  userId?: string;
  userRole?: string;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  roles?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  userId,
  userRole,
  permission,
  permissions,
  requireAll = false,
  roles,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { data: userPermissions, isLoading } = usePermissions(userId);
  const { isSuperAdmin, isAdmin } = useRole(userRole);

  if (isLoading) {
    return null;
  }

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (roles && roles.length > 0 && userRole) {
    const roleAllowed = roles.includes(userRole);
    if (!roleAllowed) return <>{fallback}</>;
  }

  if (permission && userPermissions) {
    if (!userPermissions.includes(permission)) {
      return <>{fallback}</>;
    }
  }

  if (permissions && permissions.length > 0 && userPermissions) {
    if (requireAll) {
      const allAllowed = permissions.every((p) => userPermissions.includes(p));
      if (!allAllowed) return <>{fallback}</>;
    } else {
      const anyAllowed = permissions.some((p) => userPermissions.includes(p));
      if (!anyAllowed) return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
