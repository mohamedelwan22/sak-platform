import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class CityController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "City");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "City");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "City");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "City");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "City");
  }
}
