export interface RoleData {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleWithPermissions extends RoleData {
  permissions: Array<{
    id: string;
    name: string;
    description: string | null;
    type: string;
    resource: string;
  }>;
}

export interface RoleListResponse {
  data: RoleData[];
  total: number;
}

export interface UpdateRolePermissionsInput {
  permissionIds: string[];
}
