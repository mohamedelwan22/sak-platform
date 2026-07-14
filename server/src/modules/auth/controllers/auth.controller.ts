import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class AuthController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Auth");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Auth");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Auth");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Auth");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Auth");
  }
}
