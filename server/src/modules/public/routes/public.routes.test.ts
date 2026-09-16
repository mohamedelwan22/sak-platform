import { afterEach, beforeEach, describe, expect, it } from "vitest";
import express, { type ErrorRequestHandler } from "express";
import type { Server } from "node:http";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import publicRoutes from "../routes/index.js";

let dbUp = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const describeDb = dbUp ? describe : describe.skip;

type ApiBody = {
  success: boolean;
  data?: any;
  error?: { code: string; message: string };
};

async function getJson(res: Response): Promise<ApiBody> {
  return (await res.json()) as ApiBody;
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("EXPRESS ERROR:", err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: String(err?.message ?? err) },
  });
};

describeDb("Public routes (integration)", () => {
  let server: Server;
  let baseUrl: string;
  let cleanupIds: { lands: string[]; projects: string[]; gold?: string; config?: string };

  beforeEach(async () => {
    cleanupIds = { lands: [], projects: [] };

    const app = express();
    app.use(express.json());
    app.use("/api/v1/public", publicRoutes);
    app.use(errorHandler);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("no server address");
    baseUrl = "http://127.0.0.1:" + address.port + "/api/v1/public";
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    for (const id of cleanupIds.lands) {
      await prisma.land.deleteMany({ where: { id } });
    }
    for (const id of cleanupIds.projects) {
      await prisma.project.deleteMany({ where: { id } });
    }
    if (cleanupIds.gold)
      await prisma.goldPriceHistory.deleteMany({ where: { id: cleanupIds.gold } });
    if (cleanupIds.config) await prisma.sakConfig.deleteMany({ where: { id: cleanupIds.config } });
  });

  async function seedLand(status: string, overrides: Record<string, unknown> = {}) {
    const land = await prisma.land.create({
      data: {
        titleEn: "Land " + status + " " + Date.now(),
        titleAr: "أرض " + status,
        country: "EG",
        city: "Cairo",
        assetType: "land",
        totalSakInventory: new Prisma.Decimal("100"),
        availableSak: new Prisma.Decimal("80"),
        maturityMonths: 12,
        expectedRoi: new Prisma.Decimal("12"),
        riskLevel: "none",
        status,
        coverImageUrl: "https://example.com/land-cover.jpg",
        gallery: ["https://example.com/g1.jpg"],
        documents: ["https://example.com/land-secret-doc.pdf"],
        useType: "agricultural",
        cultivationStatus: "cultivated",
        acquisitionDate: new Date("2024-03-01T00:00:00Z"),
        ...overrides,
      },
    });
    cleanupIds.lands.push(land.id);
    return land;
  }

  async function seedProject(status: string, overrides: Record<string, unknown> = {}) {
    const project = await prisma.project.create({
      data: {
        titleEn: "Project " + status + " " + Date.now(),
        titleAr: "مشروع " + status,
        country: "EG",
        city: "Cairo",
        status,
        coverImageUrl: "https://example.com/cover.jpg",
        documents: ["https://example.com/secret-doc.pdf"],
        expectedRoi: new Prisma.Decimal("15"),
        sortOrder: 1,
        ...overrides,
      },
    });
    cleanupIds.projects.push(project.id);
    return project;
  }

  it("lists only investable lands and never exposes documents", async () => {
    await seedLand("active");
    await seedLand("partially_sold");
    await seedLand("draft");

    const res = await fetch(baseUrl + "/lands");
    const body = await getJson(res);
    expect(body.success).toBe(true);
    const statuses = body.data.data.map((l: Record<string, unknown>) => l.status);
    expect(statuses).toContain("active");
    expect(statuses).toContain("partially_sold");
    expect(statuses).not.toContain("draft");
    for (const land of body.data.data as Record<string, unknown>[]) {
      expect(land).not.toHaveProperty("documents");
    }
  });

  it("returns the cover image and PRD fields on public lands", async () => {
    await seedLand("active");

    const res = await fetch(baseUrl + "/lands");
    const body = await getJson(res);
    const land = body.data.data[0] as Record<string, unknown>;
    expect(land.cover_image_url).toBe("https://example.com/land-cover.jpg");
    expect(land.use_type).toBe("agricultural");
    expect(land.cultivation_status).toBe("cultivated");
    expect(String(land.acquisition_date).slice(0, 10)).toBe("2024-03-01");
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    expect(body.data.page).toBe(1);
    expect(typeof body.data.totalPages).toBe("number");
  });

  it("filters lands by country", async () => {
    await seedLand("active", { country: "SA" });
    await seedLand("active", { country: "EG" });

    const res = await fetch(baseUrl + "/lands?country=SA");
    const body = await getJson(res);
    expect(body.success).toBe(true);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    expect(body.data.data[0].country).toBe("SA");
  });

  it("paginates lands and honours per_page alias", async () => {
    await seedLand("active", { titleEn: "One" });
    await seedLand("active", { titleEn: "Two" });

    const res = await fetch(baseUrl + "/lands?limit=1&page=1");
    const body = await getJson(res);
    expect(body.success).toBe(true);
    expect(body.data.data).toHaveLength(1);
    expect(body.data.total).toBeGreaterThanOrEqual(2);
  });

  it("returns a land by id without exposing documents", async () => {
    const land = await seedLand("active");

    const res = await fetch(baseUrl + "/lands/" + land.id);
    const body = await getJson(res);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(land.id);
    expect(body.data).not.toHaveProperty("documents");
    expect(body.data.cover_image_url).toBe("https://example.com/land-cover.jpg");
  });

  it("returns 404 for a missing land", async () => {
    const res = await fetch(baseUrl + "/lands/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    const body = await getJson(res);
    expect(body.error?.code).toBe("NOT_FOUND");
  });

  it("rejects invalid query parameters with 422", async () => {
    const res = await fetch(baseUrl + "/lands?limit=9999");
    expect(res.status).toBe(422);
    const body = await getJson(res);
    expect(body.success).toBe(false);
  });

  it("lists only active projects and includes the cover image", async () => {
    const active = await seedProject("active", {
      coverImageUrl: "https://example.com/cover-active.jpg",
    });
    const draftSeed = await seedProject("draft", {
      coverImageUrl: "https://example.com/cover-draft.jpg",
    });
    const closed = await seedProject("closed", {
      coverImageUrl: "https://example.com/cover-closed.jpg",
    });

    const res = await fetch(baseUrl + "/projects");
    const body = await getJson(res);
    expect(body.success).toBe(true);
    const rows = body.data.data as Record<string, unknown>[];
    const ids = rows.map((p) => p.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(draftSeed.id);
    expect(ids).not.toContain(closed.id);
    const ours = rows.find((p) => p.id === active.id) as Record<string, unknown>;
    expect(ours.cover_image_url).toBe("https://example.com/cover-active.jpg");
    expect(ours).not.toHaveProperty("documents");
    expect(rows.every((p) => p.status === "active")).toBe(true);
  });
});
