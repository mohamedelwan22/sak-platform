import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class HoldingController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Holding");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Holding");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Holding");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Holding");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Holding");
  }
}
