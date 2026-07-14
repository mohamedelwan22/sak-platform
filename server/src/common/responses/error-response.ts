import type { ApiResponse } from "./api-response.js";

export class ErrorResponse {
  static json(message: string, _statusCode: number, code: string, details?: unknown): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
