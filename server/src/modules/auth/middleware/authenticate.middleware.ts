import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "../../../lib/errors.js";
import { verifyAccessToken } from "../utils/index.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { prisma } from "../../../lib/prisma.js";
import type { AuthenticatedUser } from "../types/index.js";

const authRepository = new AuthRepository();

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Access token is required");
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (error instanceof Error && error.name === "TokenExpiredError") {
      throw new UnauthorizedError("Access token has expired");
    }
    throw new UnauthorizedError("Invalid access token");
  }

  const user: AuthenticatedUser = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    tokenVersion: payload.tokenVersion,
    ...(payload.imp ? { actor: payload.imp } : {}),
  };

  // Revocation and expiry of an impersonation session are enforced on EVERY
  // request rather than only on the impersonation routes, so ending a session
  // takes effect immediately instead of at token expiry. The extra query is only
  // paid while impersonating, which is rare and deliberately short-lived, so the
  // ordinary authenticated path stays stateless.
  if (payload.imp) {
    const session = await prisma.impersonationSession.findUnique({
      where: { id: payload.imp.sessionId },
      select: { targetUserId: true, expiresAt: true, endedAt: true, revokedAt: true },
    });

    if (!session || session.endedAt || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError("Impersonation session is no longer active");
    }
    if (session.targetUserId !== payload.userId) {
      throw new UnauthorizedError("Impersonation session does not match this token");
    }
  }

  (req as unknown as Record<string, unknown>).user = user;
  next();
}

/**
 * Explicit alias for readability at call sites that specifically want the
 * impersonation-liveness guarantee. Behaviourally identical to
 * {@link authenticate}, which now always enforces it.
 */
export async function authenticateWithImpersonationCheck(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return authenticate(req, res, next);
}

export async function authenticateWithDbVerification(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Access token is required");
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    const user = await authRepository.findUserById(payload.userId);
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    if (user.status !== "active") {
      throw new UnauthorizedError("Account is not active");
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError("Token has been revoked");
    }

    (req as unknown as Record<string, unknown>).user = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      tokenVersion: user.tokenVersion,
    } satisfies AuthenticatedUser;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof Error && error.name === "TokenExpiredError") {
      throw new UnauthorizedError("Access token has expired");
    }
    throw new UnauthorizedError("Invalid access token");
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError("Insufficient permissions");
    }

    next();
  };
}
