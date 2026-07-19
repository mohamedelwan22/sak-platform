import { prisma } from "../../../lib/prisma.js";
import type { IPermissionRepository } from "../interfaces/index.js";
import type {
  PermissionData,
  CreatePermissionInput,
  UpdatePermissionInput,
} from "../types/index.js";

export class PermissionRepository implements IPermissionRepository {
  async findAll(options?: { page?: number; limit?: number; resource?: string }) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 100;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (options?.resource) where.resource = options.resource;

    const [data, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        orderBy: [{ resource: "asc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.permission.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string): Promise<PermissionData | null> {
    return prisma.permission.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<PermissionData | null> {
    return prisma.permission.findUnique({ where: { name } });
  }

  async create(data: CreatePermissionInput): Promise<PermissionData> {
    return prisma.permission.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        type: data.type as "read" | "write" | "delete" | "admin",
        resource: data.resource,
      },
    });
  }

  async update(id: string, data: UpdatePermissionInput): Promise<PermissionData> {
    return prisma.permission.update({
      where: { id },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type !== undefined && {
          type: data.type as "read" | "write" | "delete" | "admin",
        }),
        ...(data.resource !== undefined && { resource: data.resource }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.permission.delete({ where: { id } });
  }

  async findManyByNames(names: string[]): Promise<PermissionData[]> {
    return prisma.permission.findMany({
      where: { name: { in: names }, isActive: true },
    });
  }
}
