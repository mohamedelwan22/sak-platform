import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { toDecimal, roundMoney } from "../lib/money.js";
import { ouncePriceToGramPrice, sakPriceFromGramPrice } from "../lib/sak-conversion.js";
import {
  GOLD_PROVIDER_NAME,
  goldApiProvider,
  type GoldProvider,
  type GoldProviderQuote,
} from "../lib/gold-api.provider.js";
import { logger } from "../lib/logger.js";
import { resolveCurrentSakConfig } from "./pricing.service.js";
import { auditService } from "../modules/audit/controllers/audit.controller.js";
import { AuditActions } from "../modules/audit/constants/index.js";

const log = logger.child({ context: "GoldPriceService" });

/** Cache TTL — Gold API recommends caching for 30 seconds. */
export const GOLD_CACHE_TTL_MS = 30_000;
/** Persist a provider price even when unchanged after this interval. */
const PERSIST_UNCHANGED_INTERVAL_MS = 15 * 60_000;
/** Minimum per-ounce delta required to persist a new history row. */
const PERSIST_MIN_DELTA_OUNCE = "0.01";
/** Internal precision for gold prices (persisted columns use 4 dp). */
const GOLD_PERSIST_PRECISION = 4;

export const SOURCE_PROVIDER = GOLD_PROVIDER_NAME;
export const SOURCE_CACHE = "cache-fallback";
export const SOURCE_DB_FALLBACK = "database-fallback";
export const SOURCE_MANUAL_OVERRIDE = "manual_override";

export interface GoldMarketQuote {
  gold: {
    symbol: "XAU";
    pricePerOunce: string;
    pricePerGram: string;
    currency: string;
  };
  sak: {
    goldWeightGrams: string;
    priceUSD: string;
    sellFeePercent: string;
  };
  source: string;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
  updatedAt: string;
  isStale: boolean;
  /** Prisma id of the gold_price_history row backing this quote (when known). */
  goldPriceHistoryId: string | null;
}

export interface GoldQuoteContext {
  pricePerOunce: Prisma.Decimal;
  pricePerGram: Prisma.Decimal;
  sakPriceUsd: Prisma.Decimal;
  sakToGoldRatio: Prisma.Decimal;
  sellFeePercent: Prisma.Decimal;
  currency: string;
  source: string;
  sourceUpdatedAt: Date | null;
  fetchedAt: Date;
  isStale: boolean;
  goldPriceHistoryId: string | null;
}

/**
 * Immutable market-price snapshot frozen at transaction time.
 * Stored as JSONB on transactions/orders — never recalculated later.
 */
export interface PriceSnapshot {
  goldPricePerOunce: string;
  goldPricePerGram: string;
  sakPriceUSD: string;
  goldWeightGramsPerSak: string;
  quantity: string;
  currency: string;
  priceTimestamp: string;
  fetchedAt: string;
  source: string;
  isStale: boolean;
  // Satisfies Prisma's InputJsonObject for direct JSON column assignment.
  [key: string]: string | boolean;
}

interface CacheEntry {
  context: GoldQuoteContext;
  expiresAt: number;
}

export interface GoldPriceHistoryFilters {
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
}

export interface GoldProviderStatus {
  provider: string;
  cache: {
    active: boolean;
    expiresAt: string | null;
    secondsUntilExpiry: number;
  };
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  consecutiveFailures: number;
}

export interface ManualOverrideResult {
  quote: GoldMarketQuote;
  goldPriceHistoryId: string;
}

export class GoldPriceService {
  private cache: CacheEntry | null = null;
  private inFlight: Promise<GoldQuoteContext> | null = null;
  private lastSuccessAt: Date | null = null;
  private lastAttemptAt: Date | null = null;
  private lastError: string | null = null;
  private lastErrorAt: Date | null = null;
  private consecutiveFailures = 0;
  private provider: GoldProvider;
  private readonly cacheTtlMs: number;

  constructor(provider: GoldProvider = goldApiProvider, cacheTtlMs: number = GOLD_CACHE_TTL_MS) {
    this.provider = provider;
    this.cacheTtlMs = cacheTtlMs;
  }

  /**
   * Current market quote. Cache-first: returns the cached quote when fresh,
   * otherwise fetches from the provider with fallback to the latest
   * persisted price. Never exposes provider implementation details.
   */
  async getCurrentGoldPrice(): Promise<GoldMarketQuote> {
    const context = await this.getQuoteContext();
    return this.toQuote(context);
  }

  /** Gold price per gram (USD) with full metadata. */
  async getGoldPricePerGram(): Promise<GoldMarketQuote> {
    return this.getCurrentGoldPrice();
  }

  /** Current SAK price (USD) with full metadata. */
  async getCurrentSAKPrice(): Promise<GoldMarketQuote> {
    return this.getCurrentGoldPrice();
  }

  /** Force a provider fetch bypassing the cache (admin manual refresh). */
  async refreshGoldPrice(): Promise<GoldMarketQuote> {
    this.cache = null;
    const context = await this.fetchFromProvider();
    return this.toQuote(context);
  }

  /** Historical gold prices with date range + pagination. */
  async getGoldPriceHistory(filters: GoldPriceHistoryFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 20));
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";

    const where: { fetchedAt?: { gte?: Date; lte?: Date } } = {};
    if (filters.from || filters.to) {
      where.fetchedAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      prisma.goldPriceHistory.findMany({
        where,
        orderBy: { fetchedAt: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.goldPriceHistory.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        price_per_ounce: row.pricePerOunce.toString(),
        price_per_gram: row.pricePerGram.toString(),
        gram_price_usd: row.gramPriceUsd.toString(),
        currency: row.currency,
        source: row.source,
        source_updated_at: row.sourceUpdatedAt?.toISOString() ?? null,
        fetched_at: row.fetchedAt.toISOString(),
        created_at: row.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Provider + cache status for the admin dashboard. */
  getProviderStatus(): GoldProviderStatus {
    const now = Date.now();
    const active = this.cache !== null && this.cache.expiresAt > now;
    return {
      provider: GOLD_PROVIDER_NAME,
      cache: {
        active,
        expiresAt: active ? new Date(this.cache!.expiresAt).toISOString() : null,
        secondsUntilExpiry: active ? Math.ceil((this.cache!.expiresAt - now) / 1000) : 0,
      },
      lastSuccessAt: this.lastSuccessAt?.toISOString() ?? null,
      lastAttemptAt: this.lastAttemptAt?.toISOString() ?? null,
      lastError: this.lastError,
      lastErrorAt: this.lastErrorAt?.toISOString() ?? null,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Admin manual price override. Persists a gold_price_history row marked
   * MANUAL_OVERRIDE and replaces the cache. The caller is responsible for
   * the audit log (controller) — the service only records the data change.
   */
  async recordManualOverride(input: {
    pricePerOunce: Prisma.Decimal | string | number;
    sourceUpdatedAt?: Date | null;
  }): Promise<ManualOverrideResult> {
    const pricePerOunce = roundMoney(input.pricePerOunce, GOLD_PERSIST_PRECISION);
    if (pricePerOunce.lessThanOrEqualTo(0)) {
      throw new AppError("Price per ounce must be greater than zero", 400, true, "INVALID_PRICE");
    }

    const config = await resolveCurrentSakConfig(prisma);
    if (!config) {
      throw new AppError("SAK configuration is not available", 503, true, "SAK_CONFIG_UNAVAILABLE");
    }

    const pricePerGram = roundMoney(ouncePriceToGramPrice(pricePerOunce), GOLD_PERSIST_PRECISION);
    const sakPriceUsd = sakPriceFromGramPrice(pricePerGram, config.sakToGoldRatio);
    const gramPriceUsd = pricePerGram;

    const row = await prisma.goldPriceHistory.create({
      data: {
        pricePerOunce,
        pricePerGram,
        gramPriceUsd,
        currency: "USD",
        source: SOURCE_MANUAL_OVERRIDE,
        sourceUpdatedAt: input.sourceUpdatedAt ?? new Date(),
      },
    });

    const context: GoldQuoteContext = {
      pricePerOunce,
      pricePerGram,
      sakPriceUsd,
      sakToGoldRatio: config.sakToGoldRatio,
      sellFeePercent: config.sellFeePercent,
      currency: "USD",
      source: SOURCE_MANUAL_OVERRIDE,
      sourceUpdatedAt: row.sourceUpdatedAt,
      fetchedAt: row.fetchedAt,
      isStale: false,
      goldPriceHistoryId: row.id,
    };
    this.setCache(context);
    this.lastSuccessAt = row.fetchedAt;
    this.lastError = null;
    this.consecutiveFailures = 0;

    return { quote: this.toQuote(context), goldPriceHistoryId: row.id };
  }

  /** Invalidate the in-memory cache (e.g. after a manual price entry). */
  invalidateCache(): void {
    this.cache = null;
  }

  /** Test seam: replace the upstream provider and drop cached quotes. */
  setProvider(provider: GoldProvider): void {
    this.provider = provider;
    this.invalidateCache();
  }

  /** Test seam: restore the real upstream provider. */
  resetProvider(): void {
    this.provider = goldApiProvider;
    this.invalidateCache();
  }

  /**
   * Full quote context used by financial flows (buy/sell/deposit) — the
   * transaction-time price snapshot is built from this value.
   */
  async getCurrentMarketQuote(): Promise<GoldQuoteContext> {
    return this.getQuoteContext();
  }

  /** Serializable price snapshot for transaction rows. */
  buildPriceSnapshot(
    context: GoldQuoteContext,
    quantity: Prisma.Decimal | string | number,
  ): PriceSnapshot {
    return {
      goldPricePerOunce: context.pricePerOunce.toString(),
      goldPricePerGram: context.pricePerGram.toString(),
      sakPriceUSD: context.sakPriceUsd.toString(),
      goldWeightGramsPerSak: context.sakToGoldRatio.toString(),
      quantity: toDecimal(quantity).toString(),
      currency: context.currency,
      priceTimestamp: context.sourceUpdatedAt?.toISOString() ?? context.fetchedAt.toISOString(),
      fetchedAt: context.fetchedAt.toISOString(),
      source: context.source,
      isStale: context.isStale,
    };
  }

  // ───────────────────────── internals ─────────────────────────

  private async getQuoteContext(): Promise<GoldQuoteContext> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      // Cache hit — serve the cached provider quote unchanged (same source,
      // never stale: it is fresh within the TTL window).
      return { ...this.cache.context };
    }
    if (this.inFlight) {
      return this.inFlight;
    }
    this.inFlight = this.fetchFromProvider().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async fetchFromProvider(): Promise<GoldQuoteContext> {
    this.lastAttemptAt = new Date();
    try {
      const [quote, config] = await Promise.all([
        this.provider.fetchXauUsd(),
        resolveCurrentSakConfig(prisma),
      ]);
      if (!config) {
        throw new AppError(
          "SAK configuration is not available",
          503,
          true,
          "SAK_CONFIG_UNAVAILABLE",
        );
      }

      const context = await this.buildProviderContext(quote, config);
      this.lastSuccessAt = new Date();
      this.lastError = null;
      this.consecutiveFailures = 0;
      this.setCache(context);
      return context;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error";
      this.lastError = message;
      this.lastErrorAt = new Date();
      this.consecutiveFailures += 1;
      log.warn("Gold provider fetch failed — activating fallback", {
        error: message,
        consecutiveFailures: this.consecutiveFailures,
      });

      // Audit the refresh failure + fallback activation once per failure
      // streak so repeated polls do not flood the audit log.
      if (this.consecutiveFailures === 1) {
        try {
          await auditService.log({
            action: AuditActions.GOLD_REFRESH_FAILED,
            entityType: "gold_price",
            actorEmail: "system",
            success: false,
            errorMessage: message,
            details: { provider: GOLD_PROVIDER_NAME },
          });
        } catch (auditError) {
          log.error("Failed to audit gold refresh failure", { auditError });
        }
      }

      if (this.cache) {
        // Fresh-enough in-memory value: keep serving it, clearly marked stale.
        const stale: GoldQuoteContext = {
          ...this.cache.context,
          source: SOURCE_CACHE,
          isStale: true,
        };
        if (this.consecutiveFailures === 1) {
          try {
            await auditService.log({
              action: AuditActions.GOLD_FALLBACK_ACTIVATED,
              entityType: "gold_price",
              actorEmail: "system",
              success: true,
              details: { fallback: SOURCE_CACHE, provider: GOLD_PROVIDER_NAME },
            });
          } catch {
            /* audit is best-effort */
          }
        }
        return stale;
      }

      const persisted = await this.loadLatestPersisted();
      if (persisted) {
        log.warn("Serving latest persisted gold price as fallback", {
          goldPriceHistoryId: persisted.goldPriceHistoryId,
        });
        if (this.consecutiveFailures === 1) {
          try {
            await auditService.log({
              action: AuditActions.GOLD_FALLBACK_ACTIVATED,
              entityType: "gold_price",
              actorEmail: "system",
              success: true,
              entityId: persisted.goldPriceHistoryId ?? undefined,
              details: { fallback: SOURCE_DB_FALLBACK, provider: GOLD_PROVIDER_NAME },
            });
          } catch {
            /* audit is best-effort */
          }
        }
        return persisted;
      }

      throw new AppError(
        "Gold price is not available and no fallback price exists",
        503,
        true,
        "GOLD_PRICE_UNAVAILABLE",
      );
    }
  }

  private async buildProviderContext(
    quote: GoldProviderQuote,
    config: NonNullable<Awaited<ReturnType<typeof resolveCurrentSakConfig>>>,
  ): Promise<GoldQuoteContext> {
    const pricePerOunce = toDecimal(quote.pricePerOunce);
    const pricePerGram = ouncePriceToGramPrice(pricePerOunce);
    const sakPriceUsd = sakPriceFromGramPrice(pricePerGram, config.sakToGoldRatio);
    const sourceUpdatedAt = quote.sourceUpdatedAt ?? new Date();
    const fetchedAt = new Date();

    const historyId = await this.persistProviderPrice({
      pricePerOunce,
      pricePerGram,
      currency: quote.currency,
      sourceUpdatedAt,
    });

    return {
      pricePerOunce,
      pricePerGram,
      sakPriceUsd,
      sakToGoldRatio: config.sakToGoldRatio,
      sellFeePercent: config.sellFeePercent,
      currency: quote.currency,
      source: SOURCE_PROVIDER,
      sourceUpdatedAt,
      fetchedAt,
      isStale: false,
      goldPriceHistoryId: historyId,
    };
  }

  /**
   * Append-only price feed: persist a new row only when the price moved by
   * at least PERSIST_MIN_DELTA_OUNCE or the previous row is older than
   * PERSIST_UNCHANGED_INTERVAL_MS, so a 30s polling frontend does not flood
   * the history table.
   */
  private async persistProviderPrice(input: {
    pricePerOunce: Prisma.Decimal;
    pricePerGram: Prisma.Decimal;
    currency: string;
    sourceUpdatedAt: Date;
  }): Promise<string | null> {
    try {
      const latest = await prisma.goldPriceHistory.findFirst({
        orderBy: { fetchedAt: "desc" },
        select: { id: true, pricePerOunce: true, fetchedAt: true },
      });

      const shouldPersist =
        latest === null ||
        Date.now() - latest.fetchedAt.getTime() >= PERSIST_UNCHANGED_INTERVAL_MS ||
        toDecimal(latest.pricePerOunce.toString())
          .sub(input.pricePerOunce)
          .abs()
          .greaterThanOrEqualTo(toDecimal(PERSIST_MIN_DELTA_OUNCE));

      if (!shouldPersist) {
        return latest?.id ?? null;
      }

      const row = await prisma.goldPriceHistory.create({
        data: {
          pricePerOunce: roundMoney(input.pricePerOunce, GOLD_PERSIST_PRECISION),
          pricePerGram: roundMoney(input.pricePerGram, GOLD_PERSIST_PRECISION),
          gramPriceUsd: roundMoney(input.pricePerGram, GOLD_PERSIST_PRECISION),
          currency: input.currency,
          source: SOURCE_PROVIDER,
          sourceUpdatedAt: input.sourceUpdatedAt,
        },
        select: { id: true },
      });
      return row.id;
    } catch (error) {
      log.error("Failed to persist gold price", { error });
      return null;
    }
  }

  private async loadLatestPersisted(): Promise<GoldQuoteContext | null> {
    const config = await resolveCurrentSakConfig(prisma);
    const row = await prisma.goldPriceHistory.findFirst({
      orderBy: { fetchedAt: "desc" },
    });
    if (!row || !config) return null;

    const pricePerOunce = toDecimal(row.pricePerOunce.toString());
    const pricePerGram = toDecimal(row.pricePerGram.toString());
    const sakPriceUsd = sakPriceFromGramPrice(pricePerGram, config.sakToGoldRatio);

    return {
      pricePerOunce,
      pricePerGram,
      sakPriceUsd,
      sakToGoldRatio: config.sakToGoldRatio,
      sellFeePercent: config.sellFeePercent,
      currency: row.currency,
      source: SOURCE_DB_FALLBACK,
      sourceUpdatedAt: row.sourceUpdatedAt,
      fetchedAt: row.fetchedAt,
      isStale: true,
      goldPriceHistoryId: row.id,
    };
  }

  private setCache(context: GoldQuoteContext): void {
    this.cache = { context, expiresAt: Date.now() + this.cacheTtlMs };
  }

  private toQuote(context: GoldQuoteContext): GoldMarketQuote {
    return {
      gold: {
        symbol: "XAU",
        pricePerOunce: context.pricePerOunce.toString(),
        pricePerGram: context.pricePerGram.toString(),
        currency: context.currency,
      },
      sak: {
        goldWeightGrams: context.sakToGoldRatio.toString(),
        priceUSD: context.sakPriceUsd.toString(),
        sellFeePercent: context.sellFeePercent.toString(),
      },
      source: context.source,
      sourceUpdatedAt: context.sourceUpdatedAt?.toISOString() ?? null,
      fetchedAt: context.fetchedAt.toISOString(),
      updatedAt: (context.sourceUpdatedAt ?? context.fetchedAt).toISOString(),
      isStale: context.isStale,
      goldPriceHistoryId: context.goldPriceHistoryId,
    };
  }
}

export const goldPriceService = new GoldPriceService();
