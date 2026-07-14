import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class SuperAdminController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "SuperAdmin");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "SuperAdmin");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "SuperAdmin");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "SuperAdmin");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "SuperAdmin");
  }
}
