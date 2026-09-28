import { Router } from "express";
import { authenticate, authenticateWithImpersonationCheck } from "../../auth/middleware/index.js";
import { requireRole } from "../../permissions/middleware/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { sendSuccess } from "../../../common/responses/index.js";
import { impersonationService } from "../services/impersonation.service.js";
import {
  startImpersonationSchema,
  revokeImpersonationSchema,
  listImpersonationQuerySchema,
} from "../validators/index.js";
import type { AuthenticatedUser } from "../../auth/types/index.js";

const router = Router();

function actorOf(req: unknown): AuthenticatedUser {
  return (req as { user: AuthenticatedUser }).user;
}

/**
 * POST /impersonation/start
 *
 * Issues a short-lived access token for the TARGET user. The caller's own
 * administrative session is untouched, so the admin can return to it at any time.
 * Requires an explicit `reason`, which is written to the audit trail.
 */
router.post(
  "/start",
  authenticate,
  requireRole("admin", "super_admin"),
  validate(startImpersonationSchema),
  async (req, res) => {
    const grant = await impersonationService.start(
      actorOf(req),
      req.body as { targetUserId: string; reason?: string; ttlMinutes?: number },
      {
        ip: String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim() || req.ip,
        userAgent: req.headers["user-agent"],
      },
    );
    sendSuccess(res, grant, "Impersonation session started");
  },
);

/** POST /impersonation/end — closes the caller's own active impersonation. */
router.post(
  "/end",
  // Validated live so an already-revoked session cannot be used to keep acting.
  authenticateWithImpersonationCheck,
  async (req, res) => {
    const result = await impersonationService.end(actorOf(req), req);
    sendSuccess(res, result, "Impersonation session ended");
  },
);

/** GET /impersonation/active — the caller's current session, if any. */
router.get("/active", authenticate, requireRole("admin", "super_admin"), async (req, res) => {
  const session = await impersonationService.getActiveForAdmin(actorOf(req).userId);
  sendSuccess(res, session ?? null, session ? "Active impersonation session" : "No active session");
});

/** GET /impersonation/sessions — audit history of impersonation activity. */
router.get(
  "/sessions",
  authenticate,
  requireRole("super_admin"),
  validate(listImpersonationQuerySchema, "query"),
  async (req, res) => {
    const { limit } = req.query as { limit?: string };
    const sessions = await impersonationService.listSessions(limit ? Number(limit) : 50);
    sendSuccess(res, sessions, "Impersonation sessions retrieved");
  },
);

/** POST /impersonation/revoke — super admin terminates any session by id. */
router.post(
  "/revoke",
  authenticate,
  requireRole("super_admin"),
  validate(revokeImpersonationSchema),
  async (req, res) => {
    await impersonationService.revoke(actorOf(req), req.body.sessionId, req);
    sendSuccess(res, { sessionId: req.body.sessionId }, "Impersonation session revoked");
  },
);

export default router;
