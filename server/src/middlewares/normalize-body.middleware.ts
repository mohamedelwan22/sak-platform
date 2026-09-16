import type { Request, Response, NextFunction } from "express";

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function normalizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(req.body)) {
      normalized[snakeToCamel(key)] = value;
    }
    req.body = normalized;
  }
  next();
}
