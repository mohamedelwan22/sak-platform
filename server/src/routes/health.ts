import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  let dbStatus = "disconnected";
  try {
    const { prisma } = await import("../lib/prisma.js");
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "error";
  }

  const isHealthy = dbStatus === "connected";

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      status: isHealthy ? "healthy" : "degraded",
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export default router;
