import type { AuditRepository } from "../repositories/audit.repository.js";
import type { CreateAuditLogInput, AuditLogFilters, AuditLogEntry } from "../types/index.js";
import { logger } from "../../../lib/logger.js";

export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(input: CreateAuditLogInput): Promise<{ id: string }> {
    const logEntry = await this.auditRepository.create(input);

    logger.info("Audit log created", {
      context: "AuditService",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorEmail: input.actorEmail,
    });

    return logEntry;
  }

  async getLogs(filters: AuditLogFilters): Promise<{
    data: AuditLogEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.auditRepository.findMany(filters);
  }
}
