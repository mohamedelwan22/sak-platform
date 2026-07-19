import { NotFoundError, ConflictError, ValidationError } from "../../../lib/errors.js";
import { PermissionRepository } from "../repositories/permissions.repository.js";
import { ALL_PERMISSIONS } from "../constants/index.js";
import type {
  PermissionData,
  CreatePermissionInput,
  UpdatePermissionInput,
} from "../types/index.js";

export class PermissionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async findAll(options?: { page?: number; limit?: number; resource?: string }) {
    return this.permissionRepository.findAll(options);
  }

  async findById(id: string): Promise<PermissionData> {
    const permission = await this.permissionRepository.findById(id);
    if (!permission) {
      throw new NotFoundError("Permission not found");
    }
    return permission;
  }

  async create(input: CreatePermissionInput): Promise<PermissionData> {
    const validNames = ALL_PERMISSIONS.map((p) => p.name);
    if (!validNames.includes(input.name as (typeof validNames)[number])) {
      throw new ValidationError(
        `Invalid permission name: ${input.name}. Must follow resource.action pattern.`,
      );
    }

    const existing = await this.permissionRepository.findByName(input.name);
    if (existing) {
      throw new ConflictError(`Permission "${input.name}" already exists`);
    }

    const permDef = ALL_PERMISSIONS.find((p) => p.name === input.name);
    return this.permissionRepository.create({
      name: input.name,
      description: input.description ?? permDef?.description,
      type: permDef?.action === "read" ? "read" : permDef?.action === "delete" ? "delete" : "write",
      resource: permDef?.resource ?? input.resource,
    });
  }

  async update(id: string, input: UpdatePermissionInput): Promise<PermissionData> {
    const existing = await this.permissionRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Permission not found");
    }

    return this.permissionRepository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.permissionRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Permission not found");
    }

    await this.permissionRepository.delete(id);
  }
}
