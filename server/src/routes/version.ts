import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: "sak100-server",
      version: "1.0.0",
      apiVersion: "v1",
      environment: process.env.NODE_ENV ?? "development",
    },
  });
});

export default router;
