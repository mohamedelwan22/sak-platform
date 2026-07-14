import type { ApiResponse, PaginationMeta } from "./api-response.js";

export class PaginatedResponse {
  static json<T>(data: T[], meta: PaginationMeta, message?: string): ApiResponse<T[]> {
    return {
      success: true,
      data,
      meta,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}
