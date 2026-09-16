import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { LandController } from "../controllers/lands.controller.js";
import { ConflictError, ValidationError } from "../../../lib/errors.js";

let dbUp = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const describeDb = dbUp ? describe : describe.skip;

function mockReq(
  userId: string,
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
) {
  return {
    user: { userId, email: "admin@test.sak100", role: "admin" },
    body,
    params,
    method: "POST",
    originalUrl: "/api/v1/admin/lands",
    ip: "127.0.0.1",
    get: () => undefined,
  } as unknown as Request;
}

function mockRes() {
  let statusCode = 200;
  let body: any = null;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      body = data;
      return res;
    },
  } as unknown as Response;
  return {
    res,
    get: () => ({ statusCode, body }),
    reset: () => {
      statusCode = 200;
      body = null;
    },
  };
}

describeDb("LandController (integration)", () => {
  const controller = new LandController();
  let userId: string;
  let landId: string;
  let landIds: string[];

  beforeEach(async () => {
    const role = await prisma.role.findUnique({ where: { name: "admin" } });
    if (!role) throw new Error("admin role not found");

    const suffix = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
    const user = await prisma.user.create({
      data: {
        email: `land-controller-${suffix}@sak100.invalid`,
        accountNumber: `9${suffix.slice(-8)}`,
        firstName: "Land",
        lastName: "Test",
        roleId: role.id,
        status: "active",
        emailVerified: true,
      },
    });
    userId = user.id;
    landIds = [];
    landId = "";
  });

  afterEach(async () => {
    for (const id of landIds) {
      await prisma.profitPayout.deleteMany({ where: { distribution: { landId: id } } });
      await prisma.profitDistribution.deleteMany({ where: { landId: id } });
      await prisma.order.deleteMany({ where: { landId: id } });
      await prisma.holding.deleteMany({ where: { landId: id } });
      await prisma.auditLog.deleteMany({ where: { entityId: id } });
      await prisma.land.deleteMany({ where: { id } });
    }
    await new Promise((r) => setTimeout(r, 200));
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  const validLand = (overrides: Record<string, unknown> = {}) => ({
    titleAr: "أرض اختبار",
    titleEn: "Test Land",
    country: "EG",
    city: "Cairo",
    assetType: "land",
    totalSakInventory: 100,
    availableSak: 100,
    maturityMonths: 12,
    expectedRoi: 12.5,
    riskLevel: "none",
    status: "draft",
    useType: "agricultural",
    cultivationStatus: "cultivated",
    acquisitionDate: "2024-01-15",
    ...overrides,
  });

  async function waitForAuditLog(action: string, entityId: string, timeoutMs = 3000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const log = await prisma.auditLog.findFirst({
        where: { entityType: "land", entityId, action },
      });
      if (log) return log;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  }

  it("creates a land with the PRD fields persisted", async () => {
    const { res, get } = mockRes();
    await controller.create(mockReq(userId, validLand()), res);
    const { statusCode, body } = get();
    expect(statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.use_type).toBe("agricultural");
    expect(body.data.cultivation_status).toBe("cultivated");
    expect(body.data.acquisition_date).toBeDefined();
    const dateStr = new Date(body.data.acquisition_date).toISOString().slice(0, 10);
    expect(dateStr).toBe("2024-01-15");
    expect(body.data.risk_level).toBe("none");

    landId = body.data.id;
    landIds.push(landId);

    const log = await waitForAuditLog("land.created", landId);
    expect(log).not.toBeNull();
    expect(log!.actorId).toBe(userId);
  });

  it("rejects availableSak greater than totalSakInventory", async () => {
    const { res } = mockRes();
    await expect(
      controller.create(
        mockReq(userId, validLand({ availableSak: 150, totalSakInventory: 100 })),
        res,
      ),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a land bound to a non-existent project", async () => {
    const { res } = mockRes();
    await expect(
      controller.create(
        mockReq(userId, validLand({ projectId: "00000000-0000-0000-0000-000000000000" })),
        res,
      ),
    ).rejects.toThrow(ValidationError);
  });

  it("allows a partial update without enforcing a status transition", async () => {
    const { res: resC, get: getC } = mockRes();
    await controller.create(mockReq(userId, validLand({ status: "active" })), resC);
    landId = getC().body.data.id;
    landIds.push(landId);

    const { res: resU, get: getU } = mockRes();
    await controller.update(mockReq(userId, { titleEn: "Updated Title" }, { id: landId }), resU);
    const { statusCode, body } = getU();
    expect(statusCode).toBe(200);
    expect(body.data.title_en).toBe("Updated Title");
    expect(body.data.status).toBe("active");
  });

  it("rejects an illegal direct transition that BR-019 forbids (active -> sold_out)", async () => {
    const { res: resC, get: getC } = mockRes();
    await controller.create(mockReq(userId, validLand({ status: "active" })), resC);
    landId = getC().body.data.id;
    landIds.push(landId);

    const { res } = mockRes();
    await expect(
      controller.update(mockReq(userId, { status: "sold_out" }, { id: landId }), res),
    ).rejects.toThrow(ConflictError);
  });

  it("rejects a transition out of closed", async () => {
    const { res: resC, get: getC } = mockRes();
    await controller.create(mockReq(userId, validLand({ status: "closed" })), resC);
    landId = getC().body.data.id;
    landIds.push(landId);

    const { res } = mockRes();
    await expect(
      controller.update(mockReq(userId, { status: "active" }, { id: landId }), res),
    ).rejects.toThrow(ConflictError);
  });

  it("allows draft -> active and logs the transition audit entry", async () => {
    const { res: resC, get: getC } = mockRes();
    await controller.create(mockReq(userId, validLand({ status: "draft" })), resC);
    landId = getC().body.data.id;
    landIds.push(landId);

    const { res: resU } = mockRes();
    await controller.update(mockReq(userId, { status: "active" }, { id: landId }), resU);

    const log = await waitForAuditLog("land.updated", landId);
    expect(log).not.toBeNull();
    expect((log!.newValues as Record<string, unknown>).status).toBe("active");
  });

  it("returns 404 when updating or deleting a missing land", async () => {
    const missingId = "00000000-0000-0000-0000-000000000000";

    const { res: resU, get: getU } = mockRes();
    await controller.update(mockReq(userId, { titleEn: "X" }, { id: missingId }), resU);
    expect(getU().statusCode).toBe(404);

    const { res: resD, get: getD } = mockRes();
    await controller.delete(mockReq(userId, {}, { id: missingId }), resD);
    expect(getD().statusCode).toBe(404);
  });

  it("deletes a land with no dependents and records the audit entry", async () => {
    const { res: resC, get: getC } = mockRes();
    await controller.create(mockReq(userId, validLand()), resC);
    landId = getC().body.data.id;

    const { res: resD, get: getD } = mockRes();
    await controller.delete(mockReq(userId, {}, { id: landId }), resD);
    const { statusCode, body } = getD();
    expect(statusCode).toBe(200);
    expect(body.success).toBe(true);

    expect(await prisma.land.findUnique({ where: { id: landId } })).toBeNull();

    const log = await waitForAuditLog("land.deleted", landId);
    expect(log).not.toBeNull();

    landIds = landIds.filter((id) => id !== landId);
  });

  it("refuses to delete a land that already has holdings (409)", async () => {
    const { res: resC, get: getC } = mockRes();
    await controller.create(mockReq(userId, validLand({ status: "active" })), resC);
    landId = getC().body.data.id;
    landIds.push(landId);

    await prisma.holding.create({
      data: {
        userId,
        landId,
        sakOwned: new Prisma.Decimal("10"),
        purchasePricePerSakUsd: new Prisma.Decimal("100"),
        maturityDate: new Date("2026-12-31T00:00:00Z"),
      },
    });

    const { res: resD, get: getD } = mockRes();
    await controller.delete(mockReq(userId, {}, { id: landId }), resD);
    const { statusCode, body } = getD();
    expect(statusCode).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONFLICT");
    expect(await prisma.land.findUnique({ where: { id: landId } })).not.toBeNull();
  });
});
