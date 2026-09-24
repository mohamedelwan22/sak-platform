import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { toDecimal, roundMoney } from "../../../lib/money.js";
import { gramPriceToOuncePrice, ouncePriceToGramPrice } from "../../../lib/sak-conversion.js";
import type { IGoldPriceRepository } from "../interfaces/index.js";
import type {
  GoldPriceData,
  CreateGoldPriceInput,
  GoldPriceFilters,
  PaginatedGoldPrices,
} from "../types/index.js";

const GOLD_PERSIST_PRECISION = 4;

export class GoldRepository implements IGoldPriceRepository {
  async findAll(filters: GoldPriceFilters): Promise<PaginatedGoldPrices> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const allowed = ["gramPriceUsd", "createdAt", "source", "fetchedAt", "pricePerOunce"];
    const sortBy =
      filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";

    const orderBy: Prisma.GoldPriceHistoryOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const where: Prisma.GoldPriceHistoryWhereInput = {};
    if (filters.from || filters.to) {
      where.fetchedAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    const [data, total] = await Promise.all([
      prisma.goldPriceHistory.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.goldPriceHistory.count({ where }),
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
      orderBy: { fetchedAt: "desc" },
    });
    return record ? this.mapGoldPrice(record) : null;
  }

  async create(data: CreateGoldPriceInput): Promise<GoldPriceData> {
    // Derive the full price triple from whichever field was provided so the
    // ounce price, gram price, and legacy gramPriceUsd always agree.
    let pricePerOunce: Prisma.Decimal;
    let pricePerGram: Prisma.Decimal;

    if (data.pricePerOunce !== undefined) {
      pricePerOunce = roundMoney(toDecimal(data.pricePerOunce), GOLD_PERSIST_PRECISION);
      pricePerGram = roundMoney(ouncePriceToGramPrice(pricePerOunce), GOLD_PERSIST_PRECISION);
    } else {
      const gram =
        data.pricePerGram !== undefined
          ? toDecimal(data.pricePerGram)
          : toDecimal(data.gramPriceUsd!);
      pricePerGram = roundMoney(gram, GOLD_PERSIST_PRECISION);
      pricePerOunce = roundMoney(gramPriceToOuncePrice(pricePerGram), GOLD_PERSIST_PRECISION);
    }

    const record = await prisma.goldPriceHistory.create({
      data: {
        pricePerOunce,
        pricePerGram,
        gramPriceUsd: pricePerGram,
        currency: data.currency ?? "USD",
        source: data.source ?? "manual",
        sourceUpdatedAt: data.sourceUpdatedAt ?? new Date(),
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
      pricePerOunce: Number(row.pricePerOunce),
      pricePerGram: Number(row.pricePerGram),
      currency: row.currency,
      source: row.source,
      sourceUpdatedAt: row.sourceUpdatedAt ?? null,
      fetchedAt: row.fetchedAt,
      createdAt: row.createdAt,
    };
  }
}
