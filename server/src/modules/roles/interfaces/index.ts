import type { RoleData, RoleWithPermissions } from "../types/index.js";

export interface IRoleRepository {
  findAll(): Promise<RoleData[]>;
  findById(id: string): Promise<RoleWithPermissions | null>;
  findByName(name: string): Promise<RoleData | null>;
  updateRolePermissions(roleId: string, permissionIds: string[]): Promise<RoleWithPermissions>;
  getUserPermissions(
    userId: string,
  ): Promise<Array<{ id: string; name: string; resource: string }>>;
}
