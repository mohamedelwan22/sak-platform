import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class GoldController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Gold");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Gold");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Gold");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Gold");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Gold");
  }
}
