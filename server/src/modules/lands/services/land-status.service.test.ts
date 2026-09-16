import { describe, expect, it } from "vitest";
import { ConflictError } from "../../../lib/errors.js";
import { assertLandStatusTransition } from "./land-status.service.js";

describe("assertLandStatusTransition (BR-019)", () => {
  const base = { availableSak: 50, totalSakInventory: 100 };

  it("allows an unchanged status without touching inventory", () => {
    for (const status of ["draft", "active", "partially_sold", "sold_out", "closed"]) {
      const result = assertLandStatusTransition({
        currentStatus: status,
        requestedStatus: status,
        availableSak: 0,
        totalSakInventory: 100,
      });
      expect(result.allowed).toBe(true);
      expect(result.edgeCase).toBe(false);
    }
  });

  it("allows draft -> active when SAK are available", () => {
    const result = assertLandStatusTransition({
      ...base,
      currentStatus: "draft",
      requestedStatus: "active",
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects draft -> active with no available SAK", () => {
    expect(() =>
      assertLandStatusTransition({
        currentStatus: "draft",
        requestedStatus: "active",
        availableSak: 0,
        totalSakInventory: 100,
      }),
    ).toThrow(ConflictError);
  });

  it("allows active -> partially_sold when partially sold", () => {
    const result = assertLandStatusTransition({
      ...base,
      currentStatus: "active",
      requestedStatus: "partially_sold",
      availableSak: 40,
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects active -> partially_sold when nothing is sold", () => {
    expect(() =>
      assertLandStatusTransition({
        currentStatus: "active",
        requestedStatus: "partially_sold",
        availableSak: 100,
        totalSakInventory: 100,
      }),
    ).toThrow(ConflictError);
  });

  it("allows partially_sold -> sold_out when fully sold", () => {
    const result = assertLandStatusTransition({
      currentStatus: "partially_sold",
      requestedStatus: "sold_out",
      availableSak: 0,
      totalSakInventory: 100,
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects partially_sold -> sold_out while SAK remain", () => {
    expect(() =>
      assertLandStatusTransition({
        currentStatus: "partially_sold",
        requestedStatus: "sold_out",
        availableSak: 10,
        totalSakInventory: 100,
      }),
    ).toThrow(ConflictError);
  });

  it("allows sold_out -> active when inventory is replenished and flags the edge case", () => {
    const result = assertLandStatusTransition({
      currentStatus: "sold_out",
      requestedStatus: "active",
      availableSak: 25,
      totalSakInventory: 100,
    });
    expect(result.allowed).toBe(true);
    expect(result.edgeCase).toBe(true);
  });

  it("rejects sold_out -> active with no available SAK", () => {
    expect(() =>
      assertLandStatusTransition({
        currentStatus: "sold_out",
        requestedStatus: "active",
        availableSak: 0,
        totalSakInventory: 100,
      }),
    ).toThrow(ConflictError);
  });

  it("allows any status -> closed regardless of inventory", () => {
    for (const current of ["draft", "active", "partially_sold", "sold_out"]) {
      const result = assertLandStatusTransition({
        currentStatus: current,
        requestedStatus: "closed",
        availableSak: 0,
        totalSakInventory: 100,
      });
      expect(result.allowed).toBe(true);
    }
  });

  it("rejects transitions out of closed", () => {
    for (const requested of ["active", "partially_sold", "sold_out", "draft"]) {
      expect(() =>
        assertLandStatusTransition({
          currentStatus: "closed",
          requestedStatus: requested,
          availableSak: 100,
          totalSakInventory: 100,
        }),
      ).toThrow(ConflictError);
    }
  });

  it("rejects unknown current statuses", () => {
    expect(() =>
      assertLandStatusTransition({ ...base, currentStatus: "archived", requestedStatus: "active" }),
    ).toThrow(ConflictError);
  });

  it("rejects unknown requested statuses", () => {
    expect(() =>
      assertLandStatusTransition({ ...base, currentStatus: "draft", requestedStatus: "paused" }),
    ).toThrow(ConflictError);
  });
});
