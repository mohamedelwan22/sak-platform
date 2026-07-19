import { apiClient } from "./client";
import type { ApiResponse } from "@/types";

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorEmail: string;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  operatingSystem: string | null;
  method: string | null;
  url: string | null;
  httpStatus: number | null;
  success: boolean;
  errorMessage: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  actorId?: string;
  entityId?: string;
  success?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditSearchInput {
  query?: string;
  action?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
}

export interface CursorPaginatedAuditLogs {
  data: AuditLogEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const auditApi = {
  getAll: (filters?: AuditLogFilters) =>
    apiClient.get<ApiResponse<PaginatedAuditLogs>>("/audit", { params: filters }),

  getById: (id: string) => apiClient.get<ApiResponse<AuditLogEntry>>(`/audit/${id}`),

  getByUser: (
    userId: string,
    filters?: Pick<
      AuditLogFilters,
      "action" | "entityType" | "startDate" | "endDate" | "page" | "limit"
    >,
  ) => apiClient.get<ApiResponse<PaginatedAuditLogs>>(`/audit/user/${userId}`, { params: filters }),

  getByEntity: (
    entity: string,
    entityId: string,
    filters?: Pick<AuditLogFilters, "action" | "startDate" | "endDate" | "page" | "limit">,
  ) =>
    apiClient.get<ApiResponse<PaginatedAuditLogs>>(`/audit/entity/${entity}/${entityId}`, {
      params: filters,
    }),

  search: (input: AuditSearchInput) =>
    apiClient.post<ApiResponse<CursorPaginatedAuditLogs>>("/audit/search", input),
};
