import type { Request, Response } from "express";
import { sendSuccess } from "../../../common/responses/index.js";
import { RoleService } from "../services/roles.service.js";
import { RoleRepository } from "../repositories/roles.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const roleRepository = new RoleRepository();
const roleService = new RoleService(roleRepository);

export class RoleController {
  async findAll(_req: Request, res: Response): Promise<void> {
    const roles = await roleService.findAll();
    sendSuccess(res, roles, "Roles retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const role = await roleService.findById(id as string);
    sendSuccess(res, role, "Role retrieved");
  }

  async updatePermissions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const beforeRole = await roleService.findById(id as string);
    const beforePermIds = beforeRole?.permissions?.map((p) => p.id) ?? [];

    const result = await roleService.updatePermissions(id as string, req.body);

    const afterPermIds = result.permissions?.map((p) => p.id) ?? [];

    auditService.logFromRequest(req, {
      action: AuditActions.ROLE_PERMISSIONS_UPDATED,
      entityType: "role",
      entityId: id as string,
      oldValues: { permissionIds: beforePermIds },
      newValues: { permissionIds: afterPermIds },
      success: true,
      details: {
        roleName: result.name,
        added: afterPermIds.filter((p) => !beforePermIds.includes(p)),
        removed: beforePermIds.filter((p) => !afterPermIds.includes(p)),
      },
    });

    sendSuccess(res, result, "Role permissions updated");
  }

  async getUserPermissions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const permissions = await roleService.getUserPermissions(id as string);
    sendSuccess(res, permissions, "User permissions retrieved");
  }
}

export { roleService };
