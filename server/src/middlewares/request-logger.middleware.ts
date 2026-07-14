import type { Request, Response, NextFunction } from "express";
import { createChildLogger } from "../lib/logger.js";

const httpLogger = createChildLogger("http");

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    try {
      const duration = Date.now() - start;
      httpLogger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        requestId: req.requestId,
      });
    } catch {
      // Ignore logging errors
    }
  });

  next();
}
