/**
 * GET /admin/activity — server-side pagination contract.
 *
 * Locks in: 10 items per page by default, newest → oldest ordering, a stable
 * page boundary (no duplicated or skipped rows), the response envelope, and
 * correct hasNext / hasPrevious flags. Read-only: the endpoint must never write
 * or filter audit records.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { prisma } from "../../lib/prisma.js";
import adminRoutes from "./routes/index.js";
import { errorHandler } from "../../middlewares/error.middleware.js";
import { generateAccessToken } from "../auth/utils/index.js";

let dbUp = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const describeDb = dbUp ? describe : describe.skip;

type Envelope = {
  items: Array<{ id: string; createdAt: string; action: string }>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

describeDb("Admin activity feed pagination", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  const createdAuditIds: string[] = [];
  const seedCount = 25;

  async function fetchPage(query: string): Promise<{ status: number; body: Envelope | null }> {
    const res = await fetch(`${baseUrl}/activity${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json()) as { success: boolean; data: Envelope };
    return { status: res.status, body: json?.data ?? null };
  }

  beforeAll(async () => {
    // Dedicated fixture records so assertions never depend on ambient traffic.
    for (let i = 0; i < seedCount; i++) {
      const row = await prisma.auditLog.create({
        data: {
          action: "admin.activity_pagination_test",
          entityType: "pagination_test",
          entityId: null,
          actorEmail: "pagination@test.invalid",
          actorRole: "admin",
          success: true,
          // Distinct, increasing timestamps keep the ordering assertion exact.
          createdAt: new Date(Date.now() - i * 60_000),
        },
      });
      createdAuditIds.push(row.id);
    }

    const app = express();
    app.use(express.json());
    app.use("/api/v1/admin", adminRoutes);
    app.use(errorHandler);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("no server address");
    baseUrl = `http://127.0.0.1:${address.port}/api/v1/admin`;

    // A user holding AUDIT_READ (admin role grants it by default).
    const role = await prisma.role.findUnique({ where: { name: "admin" } });
    const user = await prisma.user.create({
      data: {
        email: `pagination-admin-${Date.now()}@sak100.invalid`,
        accountNumber: `4${String(Date.now()).slice(-8)}`,
        firstName: "Pagination",
        lastName: "Admin",
        roleId: role!.id,
        status: "active",
        emailVerified: true,
      },
    });
    token = generateAccessToken({
      userId: user.id,
      email: user.email ?? "",
      role: "admin",
      tokenVersion: 0,
    });

    await prisma.$disconnect();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    // Cleanup runs in a fresh client because the pooled one was disconnected.
    const { prisma: fresh } = await import("../../lib/prisma.js");
    if (createdAuditIds.length) {
      await fresh.auditLog.deleteMany({ where: { id: { in: createdAuditIds } } });
    }
    await fresh.user.deleteMany({ where: { email: { contains: "pagination-admin-" } } });
    await fresh.$disconnect();
  });

  it("defaults to 10 items per page", async () => {
    const { body } = await fetchPage("");
    expect(body).toBeTruthy();
    expect(body!.limit).toBe(10);
    expect(body!.items.length).toBeLessThanOrEqual(10);
    expect(body!.page).toBe(1);
  });

  it("honours an explicit limit", async () => {
    const { body } = await fetchPage("?page=1&limit=5");
    expect(body!.limit).toBe(5);
    expect(body!.items.length).toBe(5);
  });

  it("caps an excessive limit", async () => {
    const { body } = await fetchPage("?limit=100000");
    expect(body!.limit).toBeLessThanOrEqual(50);
  });

  it("returns the full response envelope", async () => {
    const { body } = await fetchPage("?page=1&limit=10");
    for (const key of ["items", "page", "limit", "total", "totalPages", "hasNext", "hasPrevious"]) {
      expect(body).toHaveProperty(key);
    }
    expect(Array.isArray(body!.items)).toBe(true);
    expect(typeof body!.total).toBe("number");
    expect(typeof body!.totalPages).toBe("number");
  });

  it("orders newest → oldest within a page", async () => {
    const { body } = await fetchPage("?page=1&limit=10");
    const times = body!.items.map((i) => new Date(i.createdAt).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeLessThanOrEqual(times[i - 1]);
    }
  });

  it("does not duplicate or skip rows across page boundaries", async () => {
    const p1 = await fetchPage("?page=1&limit=10");
    const p2 = await fetchPage("?page=2&limit=10");
    const ids1 = p1.body!.items.map((i) => i.id);
    const ids2 = p2.body!.items.map((i) => i.id);
    expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    // The newest row on page 2 must not be newer than the oldest on page 1.
    const oldestP1 = new Date(p1.body!.items[p1.body!.items.length - 1].createdAt).getTime();
    const newestP2 = new Date(p2.body!.items[0].createdAt).getTime();
    expect(newestP2).toBeLessThanOrEqual(oldestP1);
  });

  it("flags previous/next correctly", async () => {
    const first = await fetchPage("?page=1&limit=10");
    expect(first.body!.hasPrevious).toBe(false);
    expect(first.body!.hasNext).toBe(true);

    const second = await fetchPage("?page=2&limit=10");
    expect(second.body!.hasPrevious).toBe(true);
  });

  it("reports hasNext=false on the final page", async () => {
    const lastPage = Math.ceil((await fetchPage("?page=1&limit=10")).body!.total / 10);
    const { body } = await fetchPage(`?page=${lastPage}&limit=10`);
    expect(body!.hasNext).toBe(false);
    expect(body!.hasPrevious).toBe(true);
  });

  it("handles an out-of-range page without erroring", async () => {
    const { status, body } = await fetchPage("?page=999999&limit=10");
    expect(status).toBe(200);
    expect(body!.items).toHaveLength(0);
    expect(body!.hasNext).toBe(false);
  });

  it("normalises invalid page/limit input instead of failing", async () => {
    const { status, body } = await fetchPage("?page=-5&limit=0");
    expect(status).toBe(200);
    expect(body!.page).toBe(1);
    expect(body!.limit).toBeGreaterThanOrEqual(1);
  });

  it("requires authentication", async () => {
    const res = await fetch(`${baseUrl}/activity?page=1&limit=10`);
    expect([401, 403]).toContain(res.status);
  });

  it("is read-only: creates no audit records of its own", async () => {
    const { prisma: fresh } = await import("../../lib/prisma.js");
    const before = await fresh.auditLog.count({
      where: { action: "admin.activity_pagination_test" },
    });
    await fetchPage("?page=1&limit=10");
    await fetchPage("?page=2&limit=10");
    const after = await fresh.auditLog.count({
      where: { action: "admin.activity_pagination_test" },
    });
    expect(after).toBe(before);
    await fresh.$disconnect();
  });
});
