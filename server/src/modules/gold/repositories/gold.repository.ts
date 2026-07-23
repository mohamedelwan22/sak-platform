import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { IGoldPriceRepository } from "../interfaces/index.js";
import type {
  GoldPriceData,
  CreateGoldPriceInput,
  GoldPriceFilters,
  PaginatedGoldPrices,
} from "../types/index.js";

export class GoldRepository implements IGoldPriceRepository {
  async findAll(filters: GoldPriceFilters): Promise<PaginatedGoldPrices> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const allowed = ["gramPriceUsd", "createdAt", "source"];
    const sortBy =
      filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";

    const orderBy: Prisma.GoldPriceHistoryOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      prisma.goldPriceHistory.findMany({
        orderBy,
        skip,
        take: limit,
      }),
      prisma.goldPriceHistory.count(),
    ]);

    return {
      data: data.map(this.mapGoldPrice),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<GoldPriceData | null> {
    const record = await prisma.goldPriceHistory.findUnique({ where: { id } });
    return record ? this.mapGoldPrice(record) : null;
  }

  async findLatest(): Promise<GoldPriceData | null> {
    const record = await prisma.goldPriceHistory.findFirst({
      orderBy: { createdAt: "desc" },
    });
    return record ? this.mapGoldPrice(record) : null;
  }

  async create(data: CreateGoldPriceInput): Promise<GoldPriceData> {
    const record = await prisma.goldPriceHistory.create({
      data: {
        gramPriceUsd: data.gramPriceUsd,
        source: data.source ?? "manual",
      },
    });
    return this.mapGoldPrice(record);
  }

  async delete(id: string): Promise<void> {
    await prisma.goldPriceHistory.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return prisma.goldPriceHistory.count();
  }

  async getStatistics(period: "daily" | "weekly" | "monthly"): Promise<{
    min: number;
    max: number;
    avg: number;
    count: number;
  } | null> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "daily":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 1);
        break;
      case "weekly":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "monthly":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const result = await prisma.goldPriceHistory.aggregate({
      where: {
        createdAt: { gte: startDate },
      },
      _min: { gramPriceUsd: true },
      _max: { gramPriceUsd: true },
      _avg: { gramPriceUsd: true },
      _count: true,
    });

    if (result._count === 0) {
      const allTime = await prisma.goldPriceHistory.aggregate({
        _min: { gramPriceUsd: true },
        _max: { gramPriceUsd: true },
        _avg: { gramPriceUsd: true },
        _count: true,
      });
      if (allTime._count === 0) return null;
      return {
        min: Number(allTime._min.gramPriceUsd),
        max: Number(allTime._max.gramPriceUsd),
        avg: Number(allTime._avg.gramPriceUsd),
        count: allTime._count,
      };
    }

    return {
      min: Number(result._min.gramPriceUsd),
      max: Number(result._max.gramPriceUsd),
      avg: Number(result._avg.gramPriceUsd),
      count: result._count,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapGoldPrice(row: any): GoldPriceData {
    return {
      id: row.id,
      gramPriceUsd: Number(row.gramPriceUsd),
      source: row.source,
      createdAt: row.createdAt,
    };
  }
}
