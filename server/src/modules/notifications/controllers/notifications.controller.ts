import type { Request, Response } from "express";
import { sendNotImplemented } from "../../../common/responses/index.js";

export class NotificationController {
  async findAll(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Notification");
  }

  async findById(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Notification");
  }

  async create(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Notification");
  }

  async update(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Notification");
  }

  async delete(_req: Request, res: Response): Promise<void> {
    sendNotImplemented(res, "Notification");
  }
}
