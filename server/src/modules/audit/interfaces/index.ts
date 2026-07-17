import type { CreateAuditLogInput, AuditLogFilters, PaginatedAuditLogs } from "../types/index.js";

export interface IAuditRepository {
  create(data: CreateAuditLogInput): Promise<{ id: string }>;
  findMany(filters: AuditLogFilters): Promise<PaginatedAuditLogs>;
  count(filters: AuditLogFilters): Promise<number>;
}
