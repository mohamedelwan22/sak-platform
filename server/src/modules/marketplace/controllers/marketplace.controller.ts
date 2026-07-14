import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class MarketplaceController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Marketplace");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Marketplace");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Marketplace");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Marketplace");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Marketplace");
  }
}
