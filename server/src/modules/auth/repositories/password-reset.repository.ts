import { prisma } from "../../../lib/prisma.js";

export class PasswordResetRepository {
  async findUserByEmail(email: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    passwordHash: string;
    status: string;
  } | null> {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        passwordHash: true,
        status: true,
      },
    });
  }

  async createResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<{ id: string }> {
    return prisma.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
      select: { id: true },
    });
  }

  async findValidToken(tokenHash: string): Promise<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    user: {
      id: string;
      email: string;
      firstName: string;
      passwordHash: string;
      status: string;
    };
  } | null> {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            passwordHash: true,
            status: true,
          },
        },
      },
    });
  }

  async markTokenUsed(tokenId: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async deleteAllUserResetTokens(userId: string): Promise<number> {
    const result = await prisma.passwordResetToken.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async deleteAllRefreshTokens(userId: string): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: { userId },
    });
    return result.count;
  }
}
