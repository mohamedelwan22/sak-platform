import { Prisma } from "@prisma/client";

export const DEFAULT_MONEY_DIGITS = 8;
export const SAK_QTY_DIGITS = 4;

export function toDecimal(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function isPositiveDecimal(value: string | number | Prisma.Decimal): boolean {
  try {
    return toDecimal(value).greaterThan(0);
  } catch {
    return false;
  }
}

export function floorMoney(
  value: string | number | Prisma.Decimal,
  dp = DEFAULT_MONEY_DIGITS,
): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(dp, Prisma.Decimal.ROUND_DOWN);
}

export function ceilMoney(
  value: string | number | Prisma.Decimal,
  dp = DEFAULT_MONEY_DIGITS,
): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(dp, Prisma.Decimal.ROUND_UP);
}

export function roundMoney(
  value: string | number | Prisma.Decimal,
  dp = DEFAULT_MONEY_DIGITS,
): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(dp, Prisma.Decimal.ROUND_HALF_UP);
}
