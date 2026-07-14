import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class WalletController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Wallet");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Wallet");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Wallet");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Wallet");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Wallet");
  }
}
