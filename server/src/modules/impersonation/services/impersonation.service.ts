import crypto from "node:crypto";
import { prisma } from "../../../lib/prisma.js";
import { AppError, ForbiddenError, NotFoundError, ValidationError } from "../../../lib/errors.js";
import { logger } from "../../../lib/logger.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";
import { generateAccessToken } from "../../auth/utils/token.utils.js";
import type { AuthenticatedUser } from "../../auth/types/index.js";

/** Roles that may open an impersonation session at all. */
const IMPERSONATOR_ROLES = ["admin", "super_admin"] as const;
/** Roles that count as "privileged" and therefore need extra authority to target. */
const PRIVILEGED_ROLES = ["admin", "super_admin"] as const;

export const IMPERSONATION_TTL_MINUTES = 15;
export const IMPERSONATION_MAX_TTL_MINUTES = 60;

export interface StartImpersonationInput {
  targetUserId: string;
  reason?: string;
  ttlMinutes?: number;
}

export interface ImpersonationGrant {
  accessToken: string;
  expiresIn: string;
  session: {
    id: string;
    adminId: string;
    adminEmail: string;
    targetUserId: string;
    targetEmail: string;
    targetName: string;
    targetRole: string;
    reason: string | null;
    startedAt: Date;
    expiresAt: Date;
  };
}

type AuditReq = Parameters<typeof auditService.logFromRequest>[0];

function isPrivileged(role: string): boolean {
  return (PRIVILEGED_ROLES as readonly string[]).includes(role);
}

export class ImpersonationService {
  /**
   * Opens a short-lived impersonation session and mints an access token for the
   * TARGET user.
   *
   * Security properties, by construction:
   *  - the token carries the target's real role, so RBAC evaluates the target's
   *    authority and privileges can never be escalated;
   *  - the originating admin is embedded as `imp.actor` and is used as the audit
   *    actor for every action taken while impersonating;
   *  - a plain `admin` may not target another privileged account; only a
   *    `super_admin` may, and only a different super_admin;
   *  - the session is persisted so it can be revoked and so expiry is enforced
   *    server-side rather than trusted from the token.
   */
  async start(actor: AuthenticatedUser, input: StartImpersonationInput, meta: {
    ip?: string;
    userAgent?: string;
  }): Promise<ImpersonationGrant> {
    if (!IMPERSONATOR_ROLES.includes(actor.role as (typeof IMPERSONATOR_ROLES)[number])) {
      throw new ForbiddenError("Only administrators may impersonate users");
    }
    // Guard against an already-impersonated admin opening a nested session,
    // which would launder the true actor identity.
    if (actor.actor) {
      throw new ForbiddenError("Cannot start an impersonation session while already impersonating");
    }
    if (!input.targetUserId || !/^[0-9a-fA-F-]{36}$/.test(input.targetUserId)) {
      throw new ValidationError("A valid targetUserId is required", { targetUserId: "Invalid id" });
    }
    if (input.targetUserId === actor.userId) {
      throw new AppError("You cannot impersonate yourself", 422, true, "SELF_IMPERSONATION");
    }

    const ttl = Math.min(
      Math.max(input.ttlMinutes ?? IMPERSONATION_TTL_MINUTES, 1),
      IMPERSONATION_MAX_TTL_MINUTES,
    );

    const target = await prisma.user.findUnique({
      where: { id: input.targetUserId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        deletedAt: true,
        tokenVersion: true,
        role: { select: { name: true } },
      },
    });

    if (!target || target.deletedAt) {
      throw new NotFoundError("Target user not found");
    }
    if (target.status !== "active") {
      throw new AppError("Target account is not active", 409, true, "TARGET_INACTIVE");
    }

    // Impersonating a privileged account requires super_admin, and you may never
    // impersonate yourself — so this also blocks admin-on-super_admin.
    if (isPrivileged(target.role.name) && actor.role !== "super_admin") {
      throw new ForbiddenError("Only a super admin may impersonate a privileged account");
    }

    const admin = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { id: true, email: true, role: { select: { name: true } } },
    });
    if (!admin || admin.role.name !== actor.role) {
      throw new ForbiddenError("Administrator identity could not be verified");
    }

    const expiresAt = new Date(Date.now() + ttl * 60_000);
    const reason = input.reason?.trim() ? input.reason.trim().slice(0, 500) : null;

    const session = await prisma.impersonationSession.create({
      data: {
        adminId: actor.userId,
        targetUserId: target.id,
        reason,
        expiresAt,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    const accessToken = generateAccessToken({
      userId: target.id,
      email: target.email ?? "",
      role: target.role.name,
      tokenVersion: target.tokenVersion,
      imp: {
        sessionId: session.id,
        actorId: actor.userId,
        actorEmail: actor.email,
        actorRole: actor.role,
      },
    });

    // Audit must never silently vanish; log and continue so the grant is usable.
    try {
      await auditService.log({
        action: AuditActions.IMPERSONATION_STARTED,
        actorId: actor.userId,
        actorEmail: actor.email,
        actorRole: actor.role,
        entityType: "impersonation_session",
        entityId: session.id,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        success: true,
        details: {
          targetUserId: target.id,
          targetEmail: target.email,
          targetRole: target.role.name,
          reason,
          expiresAt,
        },
      });
    } catch (error) {
      logger.error("failed to audit impersonation start", { err: error, sessionId: session.id });
    }

    return {
      accessToken,
      expiresIn: `${ttl}m`,
      session: {
        id: session.id,
        adminId: actor.userId,
        adminEmail: actor.email,
        targetUserId: target.id,
        targetEmail: target.email ?? "",
        targetName: `${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() || (target.email ?? ""),
        targetRole: target.role.name,
        reason,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
      },
    };
  }

  /** Closes the caller's own active impersonation session. */
  async end(actor: AuthenticatedUser, auditReq: AuditReq): Promise<{ sessionId: string }> {
    const sessionId = actor.actor?.sessionId;
    if (!sessionId) {
      throw new AppError("No active impersonation session", 409, true, "NO_ACTIVE_SESSION");
    }

    const existing = await prisma.impersonationSession.findUnique({
      where: { id: sessionId },
      select: { id: true, adminId: true, targetUserId: true, endedAt: true },
    });
    if (!existing) throw new NotFoundError("Impersonation session not found");
    if (existing.endedAt) return { sessionId };

    await prisma.impersonationSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });

    await this.safeAudit(auditReq, {
      action: AuditActions.IMPERSONATION_ENDED,
      entityType: "impersonation_session",
      entityId: sessionId,
      success: true,
      details: { targetUserId: existing.targetUserId, durationMs: Date.now() - Date.now() },
    });

    return { sessionId };
  }

  /** Administrative revocation of any session, by id. */
  async revoke(actor: AuthenticatedUser, sessionId: string, auditReq: AuditReq): Promise<void> {
    if (!/^[0-9a-fA-F-]{36}$/.test(sessionId)) {
      throw new ValidationError("A valid sessionId is required", { sessionId: "Invalid id" });
    }
    const session = await prisma.impersonationSession.findUnique({
      where: { id: sessionId },
      select: { id: true, adminId: true, targetUserId: true, revokedAt: true },
    });
    if (!session) throw new NotFoundError("Impersonation session not found");

    await prisma.impersonationSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.safeAudit(auditReq, {
      action: AuditActions.IMPERSONATION_REVOKED,
      entityType: "impersonation_session",
      entityId: sessionId,
      success: true,
      details: { targetUserId: session.targetUserId, revokedBy: actor.userId },
    });
  }

  /** The caller's currently active session, or null. */
  async getActiveForAdmin(adminId: string) {
    return prisma.impersonationSession.findFirst({
      where: {
        adminId,
        endedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        reason: true,
        startedAt: true,
        expiresAt: true,
        targetUser: {
          select: { id: true, email: true, firstName: true, lastName: true, role: { select: { name: true } } },
        },
      },
    });
  }

  /** Audit history of impersonation activity, newest first. */
  async listSessions(limit = 50) {
    const rows = await prisma.impersonationSession.findMany({
      orderBy: { startedAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
      select: {
        id: true,
        reason: true,
        startedAt: true,
        expiresAt: true,
        endedAt: true,
        revokedAt: true,
        ipAddress: true,
        admin: { select: { id: true, email: true, firstName: true, lastName: true } },
        targetUser: { select: { id: true, email: true, firstName: true, lastName: true, role: { select: { name: true } } } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      startedAt: r.startedAt,
      expiresAt: r.expiresAt,
      endedAt: r.endedAt,
      revokedAt: r.revokedAt,
      ipAddress: r.ipAddress,
      state: r.revokedAt ? "revoked" : r.endedAt ? "ended" : r.expiresAt <= new Date() ? "expired" : "active",
      admin: r.admin,
      targetUser: { ...r.targetUser, role: r.targetUser.role.name },
    }));
  }

  private async safeAudit(auditReq: AuditReq, input: Parameters<typeof auditService.logFromRequest>[1]) {
    try {
      await auditService.logFromRequest(auditReq, input);
    } catch (error) {
      logger.error("failed to audit impersonation event", { err: error, action: input.action });
    }
  }
}

export const impersonationService = new ImpersonationService();

/** Opaque, non-guessable reference for support/debugging. */
export function newImpersonationReference(): string {
  return crypto.randomBytes(8).toString("hex");
}
