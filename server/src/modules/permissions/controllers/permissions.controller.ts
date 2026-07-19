import type { Request, Response } from "express";
import { sendSuccess } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { PermissionService } from "../services/permissions.service.js";
import { PermissionRepository } from "../repositories/permissions.repository.js";

const permissionRepository = new PermissionRepository();
const permissionService = new PermissionService(permissionRepository);

export class PermissionController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { page, limit, resource } = req.query;
    const result = await permissionService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      resource: resource as string | undefined,
    });
    sendSuccess(res, result, "Permissions retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const permission = await permissionService.findById(id as string);
    sendSuccess(res, permission, "Permission retrieved");
  }

  async create(req: Request, res: Response): Promise<void> {
    const result = await permissionService.create(req.body);
    sendSuccess(res, result, "Permission created", HttpStatus.CREATED);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const result = await permissionService.update(id as string, req.body);
    sendSuccess(res, result, "Permission updated");
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    await permissionService.delete(id as string);
    sendSuccess(res, null, "Permission deleted");
  }
}

export { permissionService };
