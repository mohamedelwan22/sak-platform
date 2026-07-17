import { prisma } from "../../../lib/prisma.js";
import type { IAuditRepository } from "../interfaces/index.js";
import type { CreateAuditLogInput, AuditLogFilters, PaginatedAuditLogs } from "../types/index.js";

export class AuditRepository implements IAuditRepository {
  async create(data: CreateAuditLogInput): Promise<{ id: string }> {
    const result = await prisma.auditLog.create({
      data: {
        actorId: data.actorId ?? null,
        actorEmail: data.actorEmail,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        details: data.details ?? undefined,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
      },
      select: { id: true },
    });
    return result;
  }

  async findMany(filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(filters);

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          actorId: true,
          actorEmail: true,
          action: true,
          entityType: true,
          entityId: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async count(filters: AuditLogFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.auditLog.count({ where });
  }

  private buildWhereClause(filters: AuditLogFilters) {
    const where: Record<string, unknown> = {};

    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
      };
    }

    return where;
  }
}
