import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class RoleController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Role");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Role");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Role");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Role");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Role");
  }
}
