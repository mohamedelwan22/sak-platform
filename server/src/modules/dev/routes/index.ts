import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import { getEnv } from "../../../config/env.js";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";

const router = Router();

router.get("/users", async (_req: Request, res: Response) => {
  const env = getEnv();

  if (env.NODE_ENV === "production") {
    sendNotFound(res, "Route not found");
    return;
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: { select: { name: true } },
      emailVerified: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const result = users.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role.name,
    verified: u.emailVerified,
    status: u.status,
  }));

  sendSuccess(res, result, "Development users retrieved");
});

export default router;
