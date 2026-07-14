import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class AdminController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Admin");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Admin");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Admin");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Admin");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Admin");
  }
}
