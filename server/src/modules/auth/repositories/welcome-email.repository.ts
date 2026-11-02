import { prisma } from "../../../lib/prisma.js";
import type { Prisma } from "@prisma/client";

type DbClient = PrismaClientLike | Prisma.TransactionClient;
type PrismaClientLike = typeof prisma;

export type WelcomeEmailRecord = {
  id: string;
  userId: string;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  user: {
    email: string;
    firstName: string;
    accountNumber: string;
  };
};

export class WelcomeEmailRepository {
  async enqueue(userId: string, client: DbClient = prisma): Promise<void> {
    await client.welcomeEmailDelivery.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async claim(userId: string, client: DbClient = prisma): Promise<WelcomeEmailRecord | null> {
    const staleClaimedAt = new Date(Date.now() - 15 * 60 * 1000);
    const claimed = await client.welcomeEmailDelivery.updateMany({
      where: {
        userId,
        OR: [
          {
            status: { in: ["pending", "failed"] },
            nextAttemptAt: { lte: new Date() },
          },
          { status: "processing", claimedAt: { lt: staleClaimedAt } },
        ],
      },
      data: {
        status: "processing",
        claimedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (claimed.count !== 1) return null;

    return client.welcomeEmailDelivery.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        status: true,
        attempts: true,
        user: { select: { email: true, firstName: true, accountNumber: true } },
      },
    }) as Promise<WelcomeEmailRecord | null>;
  }

  async markSent(
    id: string,
    providerId: string | undefined,
    client: DbClient = prisma,
  ): Promise<void> {
    await client.welcomeEmailDelivery.update({
      where: { id },
      data: { status: "sent", providerId, sentAt: new Date(), lastError: null },
    });
  }

  async markFailed(id: string, error: string, client: DbClient = prisma): Promise<void> {
    await client.welcomeEmailDelivery.update({
      where: { id },
      data: {
        status: "failed",
        lastError: error.slice(0, 1000),
        nextAttemptAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
  }
}
