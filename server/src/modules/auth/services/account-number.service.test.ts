import { describe, expect, it, vi } from "vitest";
import { InternalServerError } from "../../../lib/errors.js";
import type { AccountNumberService as AccountNumberServiceClass } from "./account-number.service.js";
import { AccountNumberService } from "./account-number.service.js";

type PrismaMock = {
  $queryRaw: ReturnType<typeof vi.fn>;
};

type PRISMA_CTOR = ConstructorParameters<typeof AccountNumberService>[0];

function makeService(nextValues: string[]): AccountNumberServiceClass {
  const queue = [...nextValues];
  const client: PrismaMock = {
    $queryRaw: vi.fn(async () => [{ nextval: queue.shift() ?? "0" }]),
  };
  return new AccountNumberService(client as unknown as PRISMA_CTOR);
}

describe("AccountNumberService", () => {
  it("formats sequence values as SAK + 6-digit zero-padded", async () => {
    const service = makeService(["82419", "82420", "123456"]);
    await expect(service.generateNext()).resolves.toBe("SAK082419");
    await expect(service.generateNext()).resolves.toBe("SAK082420");
    await expect(service.generateNext()).resolves.toBe("SAK123456");
  });

  it("starts at the configured sequence start value (82419 => SAK082419)", async () => {
    const service = makeService(["82419"]);
    await expect(service.generateNext()).resolves.toBe("SAK082419");
  });

  it("returns unique, monotonically increasing numbers per call", async () => {
    const service = makeService(["0", "1", "2"]);
    const a = await service.generateNext();
    const b = await service.generateNext();
    const c = await service.generateNext();
    expect(new Set([a, b, c]).size).toBe(3);
    expect(a).toBe("SAK000000");
    expect(b).toBe("SAK000001");
    expect(c).toBe("SAK000002");
  });

  it("throws InternalServerError when the range is exhausted", async () => {
    const service = makeService(["1000000"]);
    await expect(service.generateNext()).rejects.toBeInstanceOf(InternalServerError);
  });

  it("is concurrency-safe by using nextval() instead of count/max", async () => {
    const client: PrismaMock = {
      $queryRaw: vi.fn(async () => [{ nextval: "82419" }]),
    };
    const service = new AccountNumberService(client as unknown as PRISMA_CTOR);
    const values = await Promise.all([service.generateNext(), service.generateNext()]);
    expect(values).toEqual(["SAK082419", "SAK082419"]);
    // verify the generated SQL used the sequence via nextval binding
    const sql = String(client.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain("nextval");
    expect(client.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
