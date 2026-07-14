import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class SupportController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Support");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Support");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Support");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Support");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Support");
  }
}
