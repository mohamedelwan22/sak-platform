import { useQuery } from "@tanstack/react-query";
import { permissionsApi, rolesApi } from "@/api/permissions.api";
import { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } from "@/lib/permissions";

export function usePermissions(userId?: string) {
  return useQuery({
    queryKey: ["permissions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const response = await rolesApi.getUserPermissions(userId!);
      return (response.data.data ?? []).map((p) => p.name);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useHasPermission(userId?: string, permission?: string) {
  const { data: permissions, isLoading } = usePermissions(userId);
  return {
    hasPermission: permissions ? hasPermission(permissions, permission ?? "") : false,
    isLoading,
  };
}

export function useHasAnyPermission(userId?: string, permissions?: string[]) {
  const { data: userPermissions, isLoading } = usePermissions(userId);
  return {
    hasAnyPermission:
      userPermissions && permissions ? hasAnyPermission(userPermissions, permissions) : false,
    isLoading,
  };
}

export function useHasAllPermissions(userId?: string, permissions?: string[]) {
  const { data: userPermissions, isLoading } = usePermissions(userId);
  return {
    hasAllPermissions:
      userPermissions && permissions ? hasAllPermissions(userPermissions, permissions) : false,
    isLoading,
  };
}

export function useRole(userRole?: string) {
  return {
    isSuperAdmin: hasRole(userRole ?? "", ["super_admin"]),
    isAdmin: hasRole(userRole ?? "", ["super_admin", "admin"]),
    isInvestor: hasRole(userRole ?? "", ["investor"]),
    isClient: hasRole(userRole ?? "", ["client"]),
    isSupport: hasRole(userRole ?? "", ["support"]),
  };
}

export function useAllRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data } = await rolesApi.getAll();
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRolePermissions(roleId?: string) {
  return useQuery({
    queryKey: ["role-permissions", roleId],
    enabled: !!roleId,
    queryFn: async () => {
      const { data } = await rolesApi.getById(roleId!);
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
