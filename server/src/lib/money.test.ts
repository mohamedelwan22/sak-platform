import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { toDecimal, isPositiveDecimal, floorMoney, ceilMoney, roundMoney } from "./money.js";

describe("money utils", () => {
  it("toDecimal wraps primitives and passes Decimal instances through", () => {
    expect(toDecimal("12.5").toString()).toBe("12.5");
    expect(toDecimal(12.5).toString()).toBe("12.5");
    const d = new Prisma.Decimal("3.14");
    expect(toDecimal(d)).toBe(d);
  });

  it("isPositiveDecimal rejects zero, negatives, malformed input and NaN", () => {
    expect(isPositiveDecimal("0")).toBe(false);
    expect(isPositiveDecimal("-5")).toBe(false);
    expect(isPositiveDecimal("abc")).toBe(false);
    expect(isPositiveDecimal(NaN)).toBe(false);
    expect(isPositiveDecimal(0)).toBe(false);
    expect(isPositiveDecimal("0.00000001")).toBe(true);
    expect(isPositiveDecimal(10)).toBe(true);
  });

  it("floorMoney rounds down at the given precision", () => {
    expect(floorMoney("1.23456", 4).toString()).toBe("1.2345");
    expect(floorMoney("1.99999999", 4).toString()).toBe("1.9999");
    expect(floorMoney("1.23456").toString()).toBe("1.23456");
  });

  it("ceilMoney rounds up at the given precision", () => {
    expect(ceilMoney("1.00001", 4).toString()).toBe("1.0001");
    expect(ceilMoney("1.2345", 4).toString()).toBe("1.2345");
    expect(ceilMoney("1.23456").toString()).toBe("1.23456");
  });

  it("roundMoney rounds half up", () => {
    expect(roundMoney("1.23456", 4).toString()).toBe("1.2346");
    expect(roundMoney("1.23454", 4).toString()).toBe("1.2345");
  });

  it("deposit credit floors the USD→SAK division so users never exceed the exact value", () => {
    const amount = new Prisma.Decimal("100");
    const price = new Prisma.Decimal("1.3333");
    const credit = floorMoney(amount.div(price), 4);
    // 100 / 1.3333 = 75.001875046… → floored to 4 dp = 75.0018
    expect(credit.toString()).toBe("75.0018");
    expect(credit.lessThanOrEqualTo(amount.div(price))).toBe(true);
  });

  it("withdrawal reservation ceils the USD→SAK division so the freeze covers the full value", () => {
    const amount = new Prisma.Decimal("100");
    const price = new Prisma.Decimal("1.3333");
    const reserved = ceilMoney(amount.div(price), 4);
    // 100 / 1.3333 = 75.001875046… → ceiled to 4 dp = 75.0019
    expect(reserved.toString()).toBe("75.0019");
    expect(reserved.greaterThanOrEqualTo(amount.div(price))).toBe(true);
  });
});
