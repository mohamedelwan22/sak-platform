import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class KycController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Kyc");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Kyc");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Kyc");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Kyc");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Kyc");
  }
}
