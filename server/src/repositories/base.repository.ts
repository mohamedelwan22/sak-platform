import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FindManyOptions {
  where?: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">;
  include?: Record<string, boolean>;
  select?: Record<string, boolean>;
  pagination?: PaginationOptions;
}

type ModelDelegate = {
  findUnique: (args: { where: Record<string, unknown> }) => Promise<unknown>;
  findFirst: (args: {
    where: Record<string, unknown>;
    select?: Record<string, boolean>;
  }) => Promise<unknown>;
  findMany: (args: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    include?: Record<string, boolean>;
    select?: Record<string, boolean>;
    skip?: number;
    take?: number;
  }) => Promise<unknown[]>;
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  update: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Promise<unknown>;
  delete: (args: { where: Record<string, unknown> }) => Promise<unknown>;
  count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
};

export class BaseRepository {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  protected get model(): ModelDelegate {
    return (this.prisma as unknown as Record<string, ModelDelegate>)[this.modelName];
  }

  async findById(id: string): Promise<unknown> {
    return this.model.findUnique({ where: { id } });
  }

  async findOne(where: Record<string, unknown>): Promise<unknown> {
    return this.model.findFirst({ where });
  }

  async findMany(options: FindManyOptions = {}): Promise<unknown[]> {
    const { where, orderBy, include, select, pagination } = options;
    const { page = 1, limit = 10 } = pagination ?? {};

    return this.model.findMany({
      where,
      orderBy,
      include,
      select,
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findManyWithPagination(options: FindManyOptions = {}): Promise<PaginationResult<unknown>> {
    const { where, orderBy, include, select, pagination } = options;
    const { page = 1, limit = 10 } = pagination ?? {};

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        orderBy,
        include,
        select,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.model.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Record<string, unknown>): Promise<unknown> {
    return this.model.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<unknown> {
    return this.model.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<unknown> {
    return this.model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<unknown> {
    return this.model.delete({ where: { id } });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.model.count({ where });
  }

  async exists(where: Record<string, unknown>): Promise<boolean> {
    const result = await this.model.findFirst({
      where,
      select: { id: true },
    });
    return result !== null;
  }
}
