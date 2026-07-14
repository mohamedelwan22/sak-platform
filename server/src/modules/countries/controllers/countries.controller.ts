import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class CountryController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Country");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Country");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Country");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Country");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Country");
  }
}
