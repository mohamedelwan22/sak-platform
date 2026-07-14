import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class UserController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "User");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "User");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "User");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "User");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "User");
  }
}
