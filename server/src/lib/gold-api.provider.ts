import axios, { type AxiosInstance } from "axios";
import { AppError } from "./errors.js";
import { logger } from "./logger.js";

const log = logger.child({ context: "GoldApiProvider" });

const GOLD_API_BASE = "https://api.gold-api.com";
const REQUEST_TIMEOUT = 10_000;

export const GOLD_PROVIDER_NAME = "gold-api";

export interface GoldApiPriceResponse {
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  name: string;
  /** Price of gold per troy ounce in the response currency. */
  price: number;
  symbol: string;
  updatedAt: string;
  updatedAtReadable: string;
}

export interface GoldProviderQuote {
  /** Price per troy ounce (validated, positive). */
  pricePerOunce: number;
  currency: string;
  /** Provider-side update timestamp (null when unparsable). */
  sourceUpdatedAt: Date | null;
}

export interface GoldProvider {
  fetchXauUsd(): Promise<GoldProviderQuote>;
}

/**
 * Provider for https://gold-api.com — GET /price/XAU/USD (no API key).
 * The returned price is the value of one TROY OUNCE of gold; callers must
 * divide by GRAMS_PER_TROY_OUNCE to obtain the per-gram price.
 */
export class GoldApiProvider implements GoldProvider {
  private readonly client: AxiosInstance;

  constructor(baseUrl: string = GOLD_API_BASE, timeoutMs: number = REQUEST_TIMEOUT) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: timeoutMs,
      headers: { Accept: "application/json" },
    });
  }

  async fetchXauUsd(): Promise<GoldProviderQuote> {
    const response = await this.client.get<GoldApiPriceResponse>("/price/XAU/USD");
    const body = response.data;
    return validateGoldApiResponse(body);
  }
}

export function validateGoldApiResponse(body: unknown): GoldProviderQuote {
  if (body === null || typeof body !== "object") {
    log.warn("Gold API returned a non-object response");
    throw new AppError(
      "Gold provider returned an invalid response",
      502,
      true,
      "PROVIDER_INVALID_RESPONSE",
    );
  }

  const raw = body as Partial<GoldApiPriceResponse>;
  const price = Number(raw.price);

  if (!Number.isFinite(price) || price <= 0) {
    log.warn("Gold API returned a non-positive price", { price: raw.price });
    throw new AppError(
      "Gold provider returned an invalid price",
      502,
      true,
      "PROVIDER_INVALID_PRICE",
    );
  }

  if (raw.symbol && raw.symbol !== "XAU") {
    log.warn("Gold API returned an unexpected symbol", { symbol: raw.symbol });
    throw new AppError(
      "Gold provider returned an unexpected symbol",
      502,
      true,
      "PROVIDER_INVALID_SYMBOL",
    );
  }

  const currency = raw.currency && raw.currency.length > 0 ? raw.currency : "USD";

  let sourceUpdatedAt: Date | null = null;
  if (typeof raw.updatedAt === "string") {
    const parsed = new Date(raw.updatedAt);
    sourceUpdatedAt = Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  return { pricePerOunce: price, currency, sourceUpdatedAt };
}

export const goldApiProvider = new GoldApiProvider();
