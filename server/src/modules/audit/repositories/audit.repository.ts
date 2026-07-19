import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { IAuditRepository } from "../interfaces/index.js";
import type {
  CreateAuditLogInput,
  AuditLogFilters,
  PaginatedAuditLogs,
  CursorPaginatedAuditLogs,
  AuditSearchInput,
  AuditLogEntry,
} from "../types/index.js";

const AUDIT_SELECT = {
  id: true,
  actorId: true,
  actorEmail: true,
  actorRole: true,
  action: true,
  entityType: true,
  entityId: true,
  oldValues: true,
  newValues: true,
  details: true,
  ipAddress: true,
  userAgent: true,
  browser: true,
  operatingSystem: true,
  method: true,
  url: true,
  httpStatus: true,
  success: true,
  errorMessage: true,
  requestId: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

export class AuditRepository implements IAuditRepository {
  async create(data: CreateAuditLogInput): Promise<{ id: string }> {
    const result = await prisma.auditLog.create({
      data: {
        actorId: data.actorId ?? null,
        actorEmail: data.actorEmail,
        actorRole: data.actorRole ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        oldValues: (data.oldValues as Prisma.InputJsonValue) ?? undefined,
        newValues: (data.newValues as Prisma.InputJsonValue) ?? undefined,
        details: (data.details as Prisma.InputJsonValue) ?? undefined,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        browser: data.browser ?? null,
        operatingSystem: data.operatingSystem ?? null,
        method: data.method ?? null,
        url: data.url ?? null,
        httpStatus: data.httpStatus ?? null,
        success: data.success ?? true,
        errorMessage: data.errorMessage ?? null,
        requestId: data.requestId ?? null,
      },
      select: { id: true },
    });
    return result;
  }

  async findMany(filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
    const page = filters.limit ? 1 : ((filters as { page?: number }).page ?? 1);
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: AUDIT_SELECT,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map(this.mapEntry),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<AuditLogEntry | null> {
    const entry = await prisma.auditLog.findUnique({
      where: { id },
      select: AUDIT_SELECT,
    });
    return entry ? this.mapEntry(entry) : null;
  }

  async findByUserId(userId: string, filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
    const page = filters.limit ? 1 : ((filters as { page?: number }).page ?? 1);
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { ...this.buildWhereClause(filters), actorId: userId };
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy, skip, take: limit, select: AUDIT_SELECT }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map(this.mapEntry),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    filters: AuditLogFilters,
  ): Promise<PaginatedAuditLogs> {
    const page = filters.limit ? 1 : ((filters as { page?: number }).page ?? 1);
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { ...this.buildWhereClause(filters), entityType, entityId };
    const orderBy = this.buildOrderBy(filters);

    try {
      const [data, total] = await Promise.all([
        prisma.auditLog.findMany({ where, orderBy, skip, take: limit, select: AUDIT_SELECT }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        data: data.map(this.mapEntry),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }
  }

  async search(input: AuditSearchInput): Promise<CursorPaginatedAuditLogs> {
    const limit = input.limit ?? 20;
    const where: Prisma.AuditLogWhereInput = {};

    if (input.action) where.action = input.action;
    if (input.actorId) where.actorId = input.actorId;
    if (input.entityType) where.entityType = input.entityType;
    if (input.entityId) where.entityId = input.entityId;
    if (input.success !== undefined) where.success = input.success;

    if (input.startDate || input.endDate) {
      where.createdAt = {
        ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
        ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
      };
    }

    if (input.query) {
      where.OR = [
        { action: { contains: input.query, mode: "insensitive" } },
        { actorEmail: { contains: input.query, mode: "insensitive" } },
        { entityType: { contains: input.query, mode: "insensitive" } },
        { errorMessage: { contains: input.query, mode: "insensitive" } },
      ];
    }

    if (input.cursor) {
      where.createdAt = {
        ...(where.createdAt && typeof where.createdAt === "object" && "lt" in where.createdAt
          ? where.createdAt
          : {}),
        lt: new Date(input.cursor),
      };
    }

    const data = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      select: AUDIT_SELECT,
    });

    const hasMore = data.length > limit;
    const entries = hasMore ? data.slice(0, limit) : data;
    const nextCursor =
      hasMore && entries.length > 0 ? entries[entries.length - 1].createdAt.toISOString() : null;

    return {
      data: entries.map(this.mapEntry),
      nextCursor,
      hasMore,
    };
  }

  async count(filters: AuditLogFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.auditLog.count({ where });
  }

  private buildWhereClause(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.success !== undefined) where.success = filters.success;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
      };
    }

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: "insensitive" } },
        { actorEmail: { contains: filters.search, mode: "insensitive" } },
        { entityType: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private buildOrderBy(filters: AuditLogFilters): Prisma.AuditLogOrderByWithRelationInput {
    const allowedFields = ["createdAt", "action", "actorEmail", "entityType", "success"];
    const sortBy =
      filters.sortBy && allowedFields.includes(filters.sortBy) ? filters.sortBy : "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
    return { [sortBy]: sortOrder };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapEntry(row: any): AuditLogEntry {
    return {
      id: row.id,
      actorId: row.actorId,
      actorEmail: row.actorEmail,
      actorRole: row.actorRole,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      oldValues: (row.oldValues as Record<string, unknown>) ?? null,
      newValues: (row.newValues as Record<string, unknown>) ?? null,
      details: (row.details as Record<string, unknown>) ?? null,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      browser: row.browser,
      operatingSystem: row.operatingSystem,
      method: row.method,
      url: row.url,
      httpStatus: row.httpStatus,
      success: row.success,
      errorMessage: row.errorMessage,
      requestId: row.requestId,
      createdAt: row.createdAt,
    };
  }
}
