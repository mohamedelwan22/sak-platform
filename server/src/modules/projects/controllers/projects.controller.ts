import type { Request, Response } from "express";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError } from "../../../lib/errors.js";
import { ProjectService } from "../services/projects.service.js";
import { ProjectRepository } from "../repositories/projects.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const projectRepository = new ProjectRepository();
const projectService = new ProjectService(projectRepository);

export class ProjectController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { search, status, sortBy, sortOrder, page, limit } = req.query;
    const result = await projectService.findAll({
      search: search as string | undefined,
      status: status as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    sendSuccess(res, result, "Projects retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const project = await projectService.findById(id as string);
      sendSuccess(res, project, "Project retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Project not found");
        return;
      }
      throw err;
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    const project = await projectService.create(req.body);
    auditService.logFromRequest(req, {
      action: AuditActions.PROJECT_CREATED,
      entityType: "project",
      entityId: project.id,
      newValues: project as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, project, "Project created", HttpStatus.CREATED);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const before = await projectService.findById(id as string);
    const project = await projectService.update(id as string, req.body);
    auditService.logFromRequest(req, {
      action: AuditActions.PROJECT_UPDATED,
      entityType: "project",
      entityId: id as string,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: project as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, project, "Project updated");
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const before = await projectService.findById(id as string);
    await projectService.delete(id as string);
    auditService.logFromRequest(req, {
      action: AuditActions.PROJECT_DELETED,
      entityType: "project",
      entityId: id as string,
      oldValues: before as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, null, "Project deleted");
  }
}
