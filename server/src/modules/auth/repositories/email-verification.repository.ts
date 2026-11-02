import { prisma } from "../../../lib/prisma.js";
import { UnauthorizedError } from "../../../lib/errors.js";

export class EmailVerificationRepository {
  async findUserByEmail(email: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    status: string;
    emailVerified: boolean;
    accountNumber: string;
  } | null> {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        status: true,
        emailVerified: true,
        accountNumber: true,
      },
    });
  }

  async deleteAllUserTokens(userId: string): Promise<number> {
    const result = await prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  async createToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<{ id: string }> {
    return prisma.emailVerificationToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
      select: { id: true },
    });
  }

  async findLatestTokenByUserId(userId: string): Promise<{
    id: string;
    tokenHash: string;
    attempts: number;
    expiresAt: Date;
    usedAt: Date | null;
    user: {
      id: string;
      email: string;
      firstName: string;
      status: string;
      emailVerified: boolean;
      accountNumber: string;
    };
  } | null> {
    return prisma.emailVerificationToken.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            status: true,
            emailVerified: true,
            accountNumber: true,
          },
        },
      },
    });
  }

  async incrementAttempts(tokenId: string): Promise<number> {
    const token = await prisma.emailVerificationToken.update({
      where: { id: tokenId },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    return token.attempts;
  }

  async markTokenUsed(tokenId: string): Promise<void> {
    await prisma.emailVerificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, status: "active" },
    });
  }

  async activateUserWithWelcome(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { emailVerified: true, status: "active" },
      });
      await tx.welcomeEmailDelivery.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    });
  }

  async consumeTokenAndActivateWithWelcome(tokenId: string, userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.emailVerificationToken.updateMany({
        where: { id: tokenId, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) {
        throw new UnauthorizedError("Verification code has already been used");
      }
      await tx.user.update({
        where: { id: userId },
        data: { emailVerified: true, status: "active" },
      });
      await tx.welcomeEmailDelivery.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    });
  }
}
