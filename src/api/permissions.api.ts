import { apiClient } from "./client";
import type { ApiResponse } from "@/types";

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  type: string;
  resource: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export const permissionsApi = {
  getAll: () => apiClient.get<ApiResponse<{ data: Permission[]; total: number }>>("/permissions"),

  getById: (id: string) => apiClient.get<ApiResponse<Permission>>(`/permissions/${id}`),

  create: (data: { name: string; description?: string; type: string; resource: string }) =>
    apiClient.post<ApiResponse<Permission>>("/permissions", data),

  update: (id: string, data: Partial<Permission>) =>
    apiClient.put<ApiResponse<Permission>>(`/permissions/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiResponse<null>>(`/permissions/${id}`),
};

export const rolesApi = {
  getAll: () => apiClient.get<ApiResponse<Role[]>>("/roles"),

  getById: (id: string) => apiClient.get<ApiResponse<RoleWithPermissions>>(`/roles/${id}`),

  updatePermissions: (roleId: string, permissionIds: string[]) =>
    apiClient.put<ApiResponse<RoleWithPermissions>>(`/roles/${roleId}/permissions`, {
      permissionIds,
    }),

  getUserPermissions: (userId: string) =>
    apiClient.get<ApiResponse<Array<{ id: string; name: string; resource: string }>>>(
      `/roles/users/${userId}/permissions`,
    ),
};
