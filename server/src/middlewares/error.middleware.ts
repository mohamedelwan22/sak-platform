import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: err.message,
        details: err.errors,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code ?? err.constructor.name.toUpperCase().replace("ERROR", ""),
        message: err.message,
      },
    });
    return;
  }

  const httpError = err as {
    status?: number;
    statusCode?: number;
    expose?: boolean;
    type?: string;
  };
  const httpStatus = httpError.statusCode ?? httpError.status;
  if (httpStatus && httpStatus >= 400 && httpStatus < 500 && httpError.expose) {
    const code = httpError.type === "entity.parse.failed" ? "INVALID_JSON" : "BAD_REQUEST";
    res.status(httpStatus).json({
      success: false,
      error: {
        code,
        message: err.message,
      },
    });
    return;
  }

  logger.error("Unhandled error:", err);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
}
