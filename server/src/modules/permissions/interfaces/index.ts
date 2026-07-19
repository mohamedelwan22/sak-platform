import type {
  PermissionData,
  CreatePermissionInput,
  UpdatePermissionInput,
} from "../types/index.js";

export interface IPermissionRepository {
  findAll(options?: { page?: number; limit?: number; resource?: string }): Promise<{
    data: PermissionData[];
    total: number;
  }>;

  findById(id: string): Promise<PermissionData | null>;

  findByName(name: string): Promise<PermissionData | null>;

  create(data: CreatePermissionInput): Promise<PermissionData>;

  update(id: string, data: UpdatePermissionInput): Promise<PermissionData>;

  delete(id: string): Promise<void>;

  findManyByNames(names: string[]): Promise<PermissionData[]>;
}
