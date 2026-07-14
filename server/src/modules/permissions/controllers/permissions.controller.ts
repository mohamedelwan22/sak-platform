import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class PermissionController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Permission");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Permission");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Permission");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Permission");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Permission");
  }
}
