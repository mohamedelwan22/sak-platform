import type { Request, Response, NextFunction } from "express";
import { createChildLogger } from "../lib/logger.js";

const requestLogger = createChildLogger("request");

export function requestLog(req: Request, _res: Response, next: NextFunction): void {
  requestLogger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  next();
}
