import type { Response } from "express";

import type { PaginationMeta } from "./api-response.js";
import { ErrorResponse } from "./error-response.js";
import { HttpStatus } from "./http-status.js";
import { PaginatedResponse } from "./paginated-response.js";
import { SuccessResponse } from "./success-response.js";

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = HttpStatus.OK,
): void {
  res.status(statusCode).json(SuccessResponse.json(data, message, statusCode));
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message?: string,
): void {
  res.status(HttpStatus.OK).json(PaginatedResponse.json(data, meta, message));
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  code = "INTERNAL_ERROR",
  details?: unknown,
): void {
  res.status(statusCode).json(ErrorResponse.json(message, statusCode, code, details));
}

export function sendNotFound(res: Response, message = "Resource not found"): void {
  sendError(res, message, HttpStatus.NOT_FOUND, "NOT_FOUND");
}

export function sendConflict(res: Response, message = "Resource already exists"): void {
  sendError(res, message, HttpStatus.CONFLICT, "CONFLICT");
}

export function sendValidationError(res: Response, message: string, details?: unknown): void {
  sendError(res, message, HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", details);
}

export function sendNotImplemented(res: Response, resource?: string): void {
  const message = resource ? `Operation not implemented for ${resource}` : "Not implemented";
  sendError(res, message, HttpStatus.NOT_IMPLEMENTED, "NOT_IMPLEMENTED");
}
