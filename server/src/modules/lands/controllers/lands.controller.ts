import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class LandController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Land");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Land");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Land");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Land");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Land");
  }
}
