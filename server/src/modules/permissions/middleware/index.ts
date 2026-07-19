import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "../../../lib/errors.js";
import type { AuthenticatedUser } from "../../auth/types/index.js";
import { AuthRepository } from "../../auth/repositories/auth.repository.js";

const authRepository = new AuthRepository();

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError("Insufficient role permissions");
    }

    next();
  };
}

export function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    const dbUser = await authRepository.findUserById(user.userId);
    if (!dbUser) {
      throw new UnauthorizedError("User not found");
    }

    const permissions = await authRepository.findUserPermissions(user.userId);
    const userPermissions = permissions.map((p) => p.name);

    const hasAll = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasAll) {
      throw new ForbiddenError("Insufficient permissions");
    }

    next();
  };
}

export function requireAnyPermission(...requiredPermissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    const permissions = await authRepository.findUserPermissions(user.userId);
    const userPermissions = permissions.map((p) => p.name);

    const hasAny = requiredPermissions.some((perm) => userPermissions.includes(perm));

    if (!hasAny) {
      throw new ForbiddenError("Insufficient permissions");
    }

    next();
  };
}
