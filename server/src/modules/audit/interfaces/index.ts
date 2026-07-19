import type {
  CreateAuditLogInput,
  AuditLogFilters,
  PaginatedAuditLogs,
  CursorPaginatedAuditLogs,
  AuditSearchInput,
  AuditLogEntry,
} from "../types/index.js";

export interface IAuditRepository {
  create(data: CreateAuditLogInput): Promise<{ id: string }>;
  findMany(filters: AuditLogFilters): Promise<PaginatedAuditLogs>;
  findById(id: string): Promise<AuditLogEntry | null>;
  findByUserId(userId: string, filters: AuditLogFilters): Promise<PaginatedAuditLogs>;
  findByEntity(
    entityType: string,
    entityId: string,
    filters: AuditLogFilters,
  ): Promise<PaginatedAuditLogs>;
  search(input: AuditSearchInput): Promise<CursorPaginatedAuditLogs>;
  count(filters: AuditLogFilters): Promise<number>;
}
