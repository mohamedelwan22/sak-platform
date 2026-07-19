import { NotFoundError } from "../../../lib/errors.js";
import { RoleRepository } from "../repositories/roles.repository.js";
import type { RoleData, RoleWithPermissions, UpdateRolePermissionsInput } from "../types/index.js";

export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async findAll(): Promise<RoleData[]> {
    return this.roleRepository.findAll();
  }

  async findById(id: string): Promise<RoleWithPermissions> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError("Role not found");
    }
    return role;
  }

  async updatePermissions(
    roleId: string,
    input: UpdateRolePermissionsInput,
  ): Promise<RoleWithPermissions> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError("Role not found");
    }

    return this.roleRepository.updateRolePermissions(roleId, input.permissionIds);
  }

  async getUserPermissions(userId: string) {
    return this.roleRepository.getUserPermissions(userId);
  }
}
