import type { Request, Response, NextFunction } from "express";

export function responseTime(_req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  const onFinished = () => {
    try {
      const duration = Date.now() - start;
      if (!res.headersSent) {
        res.setHeader("X-Response-Time", `${duration}ms`);
      }
    } catch {
      // Headers already sent, ignore
    }
  };

  res.on("finish", onFinished);

  next();
}
