import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "../../../lib/errors.js";
import type { AuthenticatedUser } from "../../auth/types/index.js";
import { AuthRepository } from "../../auth/repositories/auth.repository.js";
import { AuditActions } from "../../audit/constants/index.js";

let _auditService: {
  log: (input: {
    actorId?: string | null;
    actorEmail: string;
    actorRole?: string | null;
    action: string;
    entityType: string;
    success: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
    method?: string | null;
    url?: string | null;
    requestId?: string | null;
    errorMessage?: string | null;
  }) => Promise<{ id: string }>;
} | null = null;

export function setAuditService(auditSvc: typeof _auditService): void {
  _auditService = auditSvc;
}

async function logAccessDenied(req: Request, action: string, errorMessage: string): Promise<void> {
  if (!_auditService) return;

  const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser | undefined;

  try {
    await _auditService.log({
      actorId: user?.userId ?? null,
      actorEmail: user?.email ?? "unauthenticated",
      actorRole: user?.role ?? null,
      action,
      entityType: "rbac",
      success: false,
      ipAddress: (req.ip ?? null) as string | null,
      userAgent: (req.get?.("user-agent") ?? null) as string | null,
      method: (req.method ?? null) as string | null,
      url: (req.originalUrl ?? null) as string | null,
      requestId: (req.requestId ?? null) as string | null,
      errorMessage,
    });
  } catch {
    // Don't let audit failure break the request
  }
}

const authRepository = new AuthRepository();

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (!allowedRoles.includes(user.role)) {
      logAccessDenied(
        req,
        AuditActions.RBAC_ACCESS_DENIED,
        `Insufficient role. Required: ${allowedRoles.join(", ")}`,
      );
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
      logAccessDenied(
        req,
        AuditActions.RBAC_ACCESS_DENIED,
        `Missing permissions: ${requiredPermissions.filter((p) => !userPermissions.includes(p)).join(", ")}`,
      );
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
      logAccessDenied(
        req,
        AuditActions.RBAC_ACCESS_DENIED,
        `Missing any of: ${requiredPermissions.join(", ")}`,
      );
      throw new ForbiddenError("Insufficient permissions");
    }

    next();
  };
}
