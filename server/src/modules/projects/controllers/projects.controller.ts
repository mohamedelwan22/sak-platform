import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class ProjectController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Project");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Project");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Project");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Project");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Project");
  }
}
