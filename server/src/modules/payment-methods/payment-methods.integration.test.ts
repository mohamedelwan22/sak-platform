import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { PaymentMethodsController } from "./controllers/payment-methods.controller.js";

let dbUp = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const describeDb = dbUp ? describe : describe.skip;

describeDb("PaymentMethods (integration)", () => {
  const controller = new PaymentMethodsController();
  let userId: string;
  let userId2: string;

  function mockReq(userId?: string, body: Record<string, unknown> = {}, params: Record<string, string> = {}) {
    return {
      user: userId ? { userId } : undefined,
      body,
      params,
    } as any;
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

  beforeEach(async () => {
    const role = await prisma.role.findUnique({ where: { name: "investor" } });
    if (!role) throw new Error("investor role not found");

    const suffix = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
    const u1 = await prisma.user.create({
      data: {
        email: `pm-test-${suffix}@sak100.invalid`,
        accountNumber: `7${suffix.slice(-8)}`,
        firstName: "PM",
        lastName: "Test",
        roleId: role.id,
        status: "active",
        emailVerified: true,
      },
    });
    userId = u1.id;

    const suffix2 = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
    const u2 = await prisma.user.create({
      data: {
        email: `pm-test2-${suffix2}@sak100.invalid`,
        accountNumber: `8${suffix2.slice(-8)}`,
        firstName: "PM2",
        lastName: "Test",
        roleId: role.id,
        status: "active",
        emailVerified: true,
      },
    });
    userId2 = u2.id;
  });

  afterEach(async () => {
    if (userId) await prisma.paymentMethod.deleteMany({ where: { userId } });
    if (userId2) await prisma.paymentMethod.deleteMany({ where: { userId: userId2 } });
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    if (userId2) await prisma.user.delete({ where: { id: userId2 } }).catch(() => {});
  });

  it("creates a bank transfer payment method and marks it as default", async () => {
    const r = mockRes();
    await controller.create(mockReq(userId, { type: "bank_transfer", details: { accountNumber: "1234567890", bankName: "NBE" } }), r.res);
    const { body } = r.get();
    expect(body.success).toBe(true);
    expect(body.data.type).toBe("bank_transfer");
    expect(body.data.is_default).toBe(true);
    expect(body.data.masked).toBe("**** 7890");
  });

  it("creates a card and stores masked number", async () => {
    const r = mockRes();
    await controller.create(mockReq(userId, { type: "card", details: { last4: "4242", brand: "Visa" } }), r.res);
    const { body } = r.get();
    expect(body.success).toBe(true);
    expect(body.data.type).toBe("card");
    expect(body.data.masked).toBe("Visa •••• 4242");
  });

  it("second method is not default when first already exists", async () => {
    const r1 = mockRes();
    await controller.create(mockReq(userId, { type: "bank_transfer", details: { iban: "EG1234567890" } }), r1.res);

    const r2 = mockRes();
    await controller.create(mockReq(userId, { type: "card", details: { last4: "1234", brand: "Mastercard" } }), r2.res);

    const list = mockRes();
    await controller.findAll(mockReq(userId), list.res);
    const methods = list.get().body.data;
    const defaults = methods.filter((m: any) => m.is_default);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].type).toBe("bank_transfer");
  });

  it("sets another method as default", async () => {
    const r1 = mockRes();
    await controller.create(mockReq(userId, { type: "bank_transfer" }), r1.res);
    const id1 = r1.get().body.data.id;

    const r2 = mockRes();
    await controller.create(mockReq(userId, { type: "card", details: { last4: "9999" } }), r2.res);
    const id2 = r2.get().body.data.id;

    const r3 = mockRes();
    await controller.update(mockReq(userId, { setDefault: true }, { id: id2 }), r3.res);
    expect(r3.get().body.data.is_default).toBe(true);

    const r4 = mockRes();
    await controller.findById(mockReq(userId, {}, { id: id1 }), r4.res);
    expect(r4.get().body.data.is_default).toBe(false);
  });

  it("does not allow more than 5 methods", async () => {
    for (let i = 0; i < 5; i++) {
      const r = mockRes();
      await controller.create(mockReq(userId, { type: "other", label: `Method ${i + 1}` }), r.res);
      expect(r.get().body.success).toBe(true);
    }
    const r6 = mockRes();
    await controller.create(mockReq(userId, { type: "other" }), r6.res);
    expect(r6.get().body.success).toBe(false);
  });

  it("rejects invalid type", async () => {
    const r = mockRes();
    await controller.create(mockReq(userId, { type: "crypto" }), r.res);
    expect(r.get().body.success).toBe(false);
    expect(r.get().statusCode).toBe(400);
  });

  it("enforces user isolation", async () => {
    const r1 = mockRes();
    await controller.create(mockReq(userId, { type: "bank_transfer" }), r1.res);
    const methodId = r1.get().body.data.id;

    const r2 = mockRes();
    await controller.findById(mockReq(userId2, {}, { id: methodId }), r2.res);
    expect(r2.get().body.success).toBe(false);
  });

  it("deletes a method and promotes next to default", async () => {
    const r1 = mockRes();
    await controller.create(mockReq(userId, { type: "bank_transfer" }), r1.res);
    const id1 = r1.get().body.data.id;

    const r2 = mockRes();
    await controller.create(mockReq(userId, { type: "card", details: { last4: "5555" } }), r2.res);
    const id2 = r2.get().body.data.id;

    const del = mockRes();
    await controller.delete(mockReq(userId, {}, { id: id1 }), del.res);
    expect(del.get().body.success).toBe(true);

    const r3 = mockRes();
    await controller.findById(mockReq(userId, {}, { id: id2 }), r3.res);
    expect(r3.get().body.data.is_default).toBe(true);
  });

  it("returns empty list for new user", async () => {
    const r = mockRes();
    await controller.findAll(mockReq(userId), r.res);
    expect(r.get().body.data).toEqual([]);
  });

  it("updates label", async () => {
    const r1 = mockRes();
    await controller.create(mockReq(userId, { type: "other", label: "Original" }), r1.res);
    const id = r1.get().body.data.id;

    const r2 = mockRes();
    await controller.update(mockReq(userId, { label: "Updated" }, { id }), r2.res);
    expect(r2.get().body.data.label).toBe("Updated");
  });
});
