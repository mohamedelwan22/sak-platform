import { prisma } from "../lib/prisma.js";
import { gramPriceToOuncePrice, ouncePriceToGramPrice } from "../lib/sak-conversion.js";
import { goldPriceService } from "../services/gold-price.service.js";
import type { GoldProviderQuote } from "../lib/gold-api.provider.js";

/**
 * Installs a deterministic gold provider backed by the latest
 * gold_price_history row — used by integration tests so financial flows
 * exercise the real quote pipeline without calling the external API.
 *
 * The stub reports pricePerOunce = gramPrice × 31.1034768 at full internal
 * precision, so the service's ounce→gram round-trip reproduces the stored
 * gram price exactly and legacy price expectations keep holding.
 */
export function installDbBackedGoldProvider(): void {
  goldPriceService.setProvider({
    async fetchXauUsd(): Promise<GoldProviderQuote> {
      const row = await prisma.goldPriceHistory.findFirst({
        orderBy: { fetchedAt: "desc" },
      });
      if (!row) {
        throw new Error("No gold price row available for the test provider");
      }
      return {
        pricePerOunce: Number(gramPriceToOuncePrice(row.pricePerGram.toString())),
        currency: row.currency,
        sourceUpdatedAt: row.sourceUpdatedAt ?? row.fetchedAt,
      };
    },
  });
}

/** Restores the real upstream provider after tests. */
export function restoreRealGoldProvider(): void {
  goldPriceService.resetProvider();
}

/**
 * Creates a complete gold_price_history data object from a per-gram USD
 * price: derives the ounce price so gram/ounce/legacy fields always agree.
 */
export function goldPriceCreateData(
  gramPriceUsd: string | number,
  extra: Record<string, unknown> = {},
): {
  gramPriceUsd: string;
  pricePerGram: string;
  pricePerOunce: string;
  currency: string;
} {
  const pricePerOunce = gramPriceToOuncePrice(gramPriceUsd);
  const pricePerGram = ouncePriceToGramPrice(pricePerOunce);
  return {
    gramPriceUsd: pricePerGram.toString(),
    pricePerGram: pricePerGram.toString(),
    pricePerOunce: pricePerOunce.toString(),
    currency: "USD",
    ...extra,
  };
}
