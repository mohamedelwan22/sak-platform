import axios, { type AxiosInstance } from "axios";
import dns from "node:dns";
import https from "node:https";
import { AppError } from "./errors.js";
import { logger } from "./logger.js";

const log = logger.child({ context: "GoldApiProvider" });

const GOLD_API_BASE = "https://api.gold-api.com";
const REQUEST_TIMEOUT = 10_000;

/**
 * Resolve IPv4 through DNS directly and preserve normal TLS validation.
 * Supports both Node.js lookup callback signatures.
 */
const goldHttpsAgent = new https.Agent({
  lookup: (hostname, options, callback) => {
    const cb =
      typeof options === "function" ? options : callback;

    dns.resolve4(hostname, (error, addresses) => {
      if (error) {
        cb(error, "");
        return;
      }

      if (typeof options === "object" && options !== null && options.all) {
        cb(null, addresses.map((address) => ({
          address,
          family: 4,
        })));
        return;
      }

      cb(null, addresses[0], 4);
    });
  },
});

export const GOLD_PROVIDER_NAME = "gold-api";

export interface GoldApiPriceResponse {
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  name: string;
  price: number;
  symbol: string;
  updatedAt: string;
  updatedAtReadable: string;
}

export interface GoldProviderQuote {
  pricePerOunce: number;
  currency: string;
  sourceUpdatedAt: Date | null;
}

export interface GoldProvider {
  fetchXauUsd(): Promise<GoldProviderQuote>;
}

/**
 * Provider for https://gold-api.com — GET /price/XAU/USD.
 * Price is per troy ounce.
 */
export class GoldApiProvider implements GoldProvider {
  private readonly client: AxiosInstance;

  constructor(
    baseUrl: string = GOLD_API_BASE,
    timeoutMs: number = REQUEST_TIMEOUT,
  ) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: timeoutMs,
      headers: { Accept: "application/json" },
      httpsAgent: goldHttpsAgent,
    });
  }

  async fetchXauUsd(): Promise<GoldProviderQuote> {
    const response =
      await this.client.get<GoldApiPriceResponse>("/price/XAU/USD");

    return validateGoldApiResponse(response.data);
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
    log.warn("Gold API returned an unexpected symbol", {
      symbol: raw.symbol,
    });
    throw new AppError(
      "Gold provider returned an unexpected symbol",
      502,
      true,
      "PROVIDER_INVALID_SYMBOL",
    );
  }

  const currency =
    raw.currency && raw.currency.length > 0 ? raw.currency : "USD";

  let sourceUpdatedAt: Date | null = null;

  if (typeof raw.updatedAt === "string") {
    const parsed = new Date(raw.updatedAt);
    sourceUpdatedAt = Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  return {
    pricePerOunce: price,
    currency,
    sourceUpdatedAt,
  };
}

export const goldApiProvider = new GoldApiProvider();
