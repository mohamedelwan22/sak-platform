import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { toDecimal } from "../lib/money.js";

export type DatabaseClient = Prisma.TransactionClient | PrismaClient;

export const DEFAULT_SAK_DIGITS = 4;

export async function resolveCurrentSakConfig(
  client: DatabaseClient,
  now = new Date(),
): Promise<{
  id: string;
  sakToGoldRatio: Prisma.Decimal;
  sellFeePercent: Prisma.Decimal;
  effectiveFrom: Date;
} | null> {
  return client.sakConfig.findFirst({
    where: { effectiveFrom: { lte: now } },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function resolveLatestGoldPrice(
  client: DatabaseClient,
): Promise<{ id: string; gramPriceUsd: Prisma.Decimal; createdAt: Date } | null> {
  return client.goldPriceHistory.findFirst({
    orderBy: { createdAt: "desc" },
  });
}

export async function resolveCurrentSakPrice(
  client: DatabaseClient,
  now = new Date(),
): Promise<Prisma.Decimal | null> {
  const [gold, config] = await Promise.all([
    resolveLatestGoldPrice(client),
    resolveCurrentSakConfig(client, now),
  ]);
  if (!gold || !config) return null;
  return toDecimal(gold.gramPriceUsd).mul(toDecimal(config.sakToGoldRatio));
}

export class PricingService {
  constructor(private readonly client: DatabaseClient = prisma) {}

  async getCurrentSakPrice(now = new Date()): Promise<Prisma.Decimal> {
    const price = await resolveCurrentSakPrice(this.client, now);
    if (!price) {
      throw new AppError("SAK price is not available", 503, true, "PRICE_UNAVAILABLE");
    }
    return price;
  }

  async getCurrentSakPriceOrNull(now = new Date()): Promise<Prisma.Decimal | null> {
    return resolveCurrentSakPrice(this.client, now);
  }

  async getCurrentSakConfig(now = new Date()) {
    return resolveCurrentSakConfig(this.client, now);
  }
}

export const pricingService = new PricingService();
