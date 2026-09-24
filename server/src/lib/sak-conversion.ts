import { Prisma } from "@prisma/client";
import { toDecimal } from "./money.js";

/**
 * 1 troy ounce = 31.1034768 grams (exact definition of the troy ounce).
 * Stored as a string so Decimal arithmetic never loses precision.
 */
export const GRAMS_PER_TROY_OUNCE = "31.1034768";

export const GOLD_INTERNAL_PRECISION = 8;
export const GOLD_DISPLAY_PRECISION = 2;

export type DecimalValue = string | number | Prisma.Decimal;

/**
 * Converts a gold price per troy ounce into a price per gram.
 * goldPricePerGramUSD = goldPricePerOunceUSD / 31.1034768
 */
export function ouncePriceToGramPrice(pricePerOunce: DecimalValue): Prisma.Decimal {
  return toDecimal(pricePerOunce)
    .div(toDecimal(GRAMS_PER_TROY_OUNCE))
    .toDecimalPlaces(GOLD_INTERNAL_PRECISION, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * Converts a gold price per gram into a price per troy ounce.
 * goldPricePerOunceUSD = goldPricePerGramUSD * 31.1034768
 */
export function gramPriceToOuncePrice(pricePerGram: DecimalValue): Prisma.Decimal {
  return toDecimal(pricePerGram)
    .mul(toDecimal(GRAMS_PER_TROY_OUNCE))
    .toDecimalPlaces(GOLD_INTERNAL_PRECISION, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * SAK → gold weight conversion.
 * goldWeight = sakQuantity * sakToGoldRatio (ratio = grams of gold per 1 SAK).
 */
export function sakToGoldWeight(
  sakQuantity: DecimalValue,
  sakToGoldRatio: DecimalValue,
): Prisma.Decimal {
  return toDecimal(sakQuantity).mul(toDecimal(sakToGoldRatio));
}

/**
 * Gold → SAK conversion.
 * sakQuantity = goldWeight / sakToGoldRatio (ratio = grams of gold per 1 SAK).
 */
export function goldWeightToSak(
  goldWeight: DecimalValue,
  sakToGoldRatio: DecimalValue,
): Prisma.Decimal {
  const ratio = toDecimal(sakToGoldRatio);
  if (ratio.isZero()) {
    throw new Error("SAK-to-gold ratio must be greater than zero");
  }
  return toDecimal(goldWeight).div(ratio);
}

/**
 * SAK USD price derived from the live gold market price:
 * sakPriceUSD = goldPricePerGramUSD * sakToGoldRatio
 * (with the canonical ratio of 0.1: 1 SAK = 0.1 gram of gold)
 */
export function sakPriceFromGramPrice(
  goldPricePerGram: DecimalValue,
  sakToGoldRatio: DecimalValue,
): Prisma.Decimal {
  return toDecimal(goldPricePerGram)
    .mul(toDecimal(sakToGoldRatio))
    .toDecimalPlaces(GOLD_INTERNAL_PRECISION, Prisma.Decimal.ROUND_HALF_UP);
}
