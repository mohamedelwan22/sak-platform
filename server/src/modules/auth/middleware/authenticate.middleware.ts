import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "../../../lib/errors.js";
import { verifyAccessToken } from "../utils/index.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import type { AuthenticatedUser } from "../types/index.js";

const authRepository = new AuthRepository();

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Access token is required");
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    const user: AuthenticatedUser = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion,
    };

    (req as unknown as Record<string, unknown>).user = user;
    next();
  } catch (error) {
    if (error instanceof Error && error.name === "TokenExpiredError") {
      throw new UnauthorizedError("Access token has expired");
    }
    throw new UnauthorizedError("Invalid access token");
  }
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
