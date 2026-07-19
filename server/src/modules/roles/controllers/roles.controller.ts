import type { Request, Response } from "express";
import { sendSuccess } from "../../../common/responses/index.js";
import { RoleService } from "../services/roles.service.js";
import { RoleRepository } from "../repositories/roles.repository.js";

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
    const result = await roleService.updatePermissions(id as string, req.body);
    sendSuccess(res, result, "Role permissions updated");
  }

  async getUserPermissions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const permissions = await roleService.getUserPermissions(id as string);
    sendSuccess(res, permissions, "User permissions retrieved");
  }
}

export { roleService };
