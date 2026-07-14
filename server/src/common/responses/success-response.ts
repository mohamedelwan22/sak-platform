import type { ApiResponse } from "./api-response.js";

export class SuccessResponse {
  static json<T>(data: T, message?: string, _statusCode?: number): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}
