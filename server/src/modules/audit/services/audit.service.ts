import type { AuditRepository } from "../repositories/audit.repository.js";
import type {
  CreateAuditLogInput,
  AuditLogFilters,
  AuditLogEntry,
  PaginatedAuditLogs,
  CursorPaginatedAuditLogs,
  AuditSearchInput,
} from "../types/index.js";
import { logger } from "../../../lib/logger.js";

const log = logger.child({ context: "AuditService" });

export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(input: CreateAuditLogInput): Promise<{ id: string }> {
    try {
      const logEntry = await this.auditRepository.create(input);
      log.info("Audit log created", {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorEmail: input.actorEmail,
        success: input.success ?? true,
      });
      return logEntry;
    } catch (error) {
      log.error("Failed to create audit log", { error, action: input.action });
      throw error;
    }
  }

  async logFromRequest(
    req: {
      user?: { userId?: string; email?: string; role?: string };
      requestId?: string;
      ip?: string;
      method?: string;
      originalUrl?: string;
      get?: (name: string) => string | undefined;
    },
    input: Omit<
      CreateAuditLogInput,
      | "actorId"
      | "actorEmail"
      | "actorRole"
      | "requestId"
      | "ipAddress"
      | "userAgent"
      | "method"
      | "url"
    >,
  ): Promise<{ id: string }> {
    return this.log({
      ...input,
      actorId: req.user?.userId ?? null,
      actorEmail: req.user?.email ?? "system",
      actorRole: req.user?.role ?? null,
      requestId: req.requestId ?? null,
      ipAddress: req.ip ?? null,
      userAgent: req.get?.("user-agent") ?? null,
      method: req.method ?? null,
      url: req.originalUrl ?? null,
    });
  }

  async getLogs(filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
    return this.auditRepository.findMany(filters);
  }

  async getLogById(id: string): Promise<AuditLogEntry | null> {
    return this.auditRepository.findById(id);
  }

  async getLogsByUserId(userId: string, filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
    return this.auditRepository.findByUserId(userId, filters);
  }

  async getLogsByEntity(
    entityType: string,
    entityId: string,
    filters: AuditLogFilters,
  ): Promise<PaginatedAuditLogs> {
    return this.auditRepository.findByEntity(entityType, entityId, filters);
  }

  async search(input: AuditSearchInput): Promise<CursorPaginatedAuditLogs> {
    return this.auditRepository.search(input);
  }

  async count(filters: AuditLogFilters): Promise<number> {
    return this.auditRepository.count(filters);
  }
}
