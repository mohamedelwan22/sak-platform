import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class SakController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Sak");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Sak");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Sak");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Sak");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Sak");
  }
}
