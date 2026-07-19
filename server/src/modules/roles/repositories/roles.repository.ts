import { prisma } from "../../../lib/prisma.js";
import type { IRoleRepository } from "../interfaces/index.js";
import type { RoleData, RoleWithPermissions } from "../types/index.js";

export class RoleRepository implements IRoleRepository {
  async findAll(): Promise<RoleData[]> {
    return prisma.role.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string): Promise<RoleWithPermissions | null> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
                type: true,
                resource: true,
              },
            },
          },
        },
      },
    });

    if (!role) return null;

    return {
      ...role,
      permissions: role.rolePermissions.map((rp) => rp.permission),
    } as RoleWithPermissions;
  }

  async findByName(name: string): Promise<RoleData | null> {
    return prisma.role.findUnique({ where: { name } });
  }

  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<RoleWithPermissions> {
    await prisma.rolePermission.deleteMany({ where: { roleId } });

    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }

    const role = await this.findById(roleId);
    if (!role) throw new Error("Role not found after update");
    return role;
  }

  async getUserPermissions(
    userId: string,
  ): Promise<Array<{ id: string; name: string; resource: string }>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    id: true,
                    name: true,
                    resource: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return [];

    return user.role.rolePermissions.map((rp) => rp.permission);
  }
}
