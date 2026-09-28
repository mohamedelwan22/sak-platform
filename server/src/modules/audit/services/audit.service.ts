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

  /**
   * Writes an audit entry.
   *
   * By default a write failure is logged and swallowed: an audit-subsystem
   * outage must not roll back or 500 an otherwise successful financial or
   * support operation. Pass `{ strict: true }` where losing the record is worse
   * than failing the request (e.g. authorising a privileged action).
   */
  async log(input: CreateAuditLogInput, options?: { strict?: boolean }): Promise<{ id: string }> {
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
      if (options?.strict) throw error;
      return { id: "" };
    }
  }

  async logFromRequest(
    req: {
      user?: {
        userId?: string;
        email?: string;
        role?: string;
        /** Present only while an admin is impersonating this user. */
        actor?: { sessionId: string; actorId: string; actorEmail: string; actorRole: string };
      };
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
    // While impersonating, `req.user` describes the TARGET. Accountability must
    // stay with the human who pulled the trigger, so the originating admin
    // becomes the actor and the target is recorded alongside as `actingAs`.
    const impersonation = req.user?.actor;
    const actorId = impersonation ? impersonation.actorId : (req.user?.userId ?? null);
    const actorEmail = impersonation ? impersonation.actorEmail : (req.user?.email ?? "system");
    const actorRole = impersonation ? impersonation.actorRole : (req.user?.role ?? null);

    const details = impersonation
      ? {
          ...(input.details && typeof input.details === "object" ? input.details : {}),
          actingAs: {
            userId: req.user?.userId ?? null,
            email: req.user?.email ?? null,
            role: req.user?.role ?? null,
          },
          impersonationSessionId: impersonation.sessionId,
        }
      : input.details;

    return this.log({
      ...input,
      details,
      actorId,
      actorEmail,
      actorRole,
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
