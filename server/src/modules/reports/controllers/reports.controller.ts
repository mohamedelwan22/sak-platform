import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class ReportController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Report");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Report");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Report");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Report");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Report");
  }
}
