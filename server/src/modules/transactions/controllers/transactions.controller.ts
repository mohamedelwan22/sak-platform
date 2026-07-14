import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class TransactionController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Transaction");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Transaction");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Transaction");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Transaction");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Transaction");
  }
}
