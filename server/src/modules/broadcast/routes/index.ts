import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../auth/middleware/index.js";
import { requireRole } from "../../permissions/middleware/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { sendSuccess, sendNotFound, sendError } from "../../../common/responses/index.js";
import { prisma } from "../../../lib/prisma.js";
import { broadcastService } from "../services/broadcast.service.js";
import {
  createBroadcastSchema,
  previewAudienceSchema,
  updateBroadcastSchema,
  userSearchSchema,
} from "../validators/index.js";
import { AuditActions } from "../../audit/constants/index.js";

const router = Router();

// ── Admin broadcast management (staff only) ────────────────────────────────

router.use(authenticate, requireRole("admin", "super_admin"));

/** GET /broadcasts/segments — segment registry for the audience picker. */
router.get("/segments", (_req, res) => {
  sendSuccess(res, broadcastService.getSegments(), "Segments retrieved");
});

/** GET /broadcasts/users — backend-controlled user picker for SPECIFIC_USERS. */
router.get("/users", validate(userSearchSchema, "query"), async (req, res) => {
  const { search, limit } = req.query as { search?: string; limit?: string };
  const rows = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: { in: ["active", "pending"] },
      ...(search
        ? {
            OR: [
              { email: { contains: String(search), mode: "insensitive" } },
              { firstName: { contains: String(search), mode: "insensitive" } },
              { lastName: { contains: String(search), mode: "insensitive" } },
              { accountNumber: { contains: String(search), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, email: true, firstName: true, lastName: true, accountNumber: true },
    orderBy: { createdAt: "desc" },
    take: Math.min(50, Number(limit) || 20),
  });
  sendSuccess(
    res,
    rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: `${u.firstName} ${u.lastName}`.trim(),
      account_number: u.accountNumber,
    })),
    "Users retrieved",
  );
});

/** POST /broadcasts/preview-audience — validated audience count preview. */
router.post("/preview-audience", validate(previewAudienceSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof previewAudienceSchema>;
    const result = await broadcastService.previewAudience(body);
    sendSuccess(res, result, "Audience preview");
  } catch {
    sendError(res, "Failed to preview audience", 400, "AUDIENCE_PREVIEW_FAILED");
  }
});

/** POST /broadcasts — create a bilingual announcement (draft). */
router.post("/", validate(createBroadcastSchema), async (req, res) => {
  const user = req.user as { userId: string };
  const body = req.body as z.infer<typeof createBroadcastSchema>;
  const broadcast = await broadcastService.create({ ...body, createdById: user.userId }, req);
  sendSuccess(res, { id: broadcast.id, status: broadcast.status }, "Announcement created", 201);
});

/** GET /broadcasts — paginated list. */
router.get("/", async (req, res) => {
  const { page, limit } = req.query as { page?: string; limit?: string };
  const result = await broadcastService.list(Number(page) || 1, Number(limit) || 20);
  sendSuccess(res, result, "Announcements retrieved");
});

/** GET /broadcasts/:id — details + delivery breakdown. */
router.get("/:id", async (req, res) => {
  try {
    const result = await broadcastService.getById(String(req.params.id));
    sendSuccess(res, result, "Announcement retrieved");
  } catch {
    sendNotFound(res, "Announcement not found");
  }
});

/** PATCH /broadcasts/:id — edit draft only. */
router.patch("/:id", validate(updateBroadcastSchema), async (req, res) => {
  try {
    const result = await broadcastService.update(String(req.params.id), req.body, req);
    sendSuccess(res, { id: result.id, status: result.status }, "Announcement updated");
  } catch (err) {
    if (
      err instanceof Error &&
      "statusCode" in err &&
      (err as { statusCode: number }).statusCode === 409
    ) {
      sendError(res, err.message, 409, "NOT_EDITABLE");
      return;
    }
    sendError(res, "Failed to update announcement");
  }
});

/** POST /broadcasts/:id/send — idempotent send. */
router.post("/:id/send", async (req, res) => {
  const user = req.user as { userId: string };
  try {
    const result = await broadcastService.send(String(req.params.id), user, req);
    sendSuccess(res, result, "Announcement sent");
  } catch (err) {
    const appErr = err as { statusCode?: number; code?: string; message?: string };
    if (appErr.statusCode) {
      sendError(
        res,
        appErr.message ?? "Send failed",
        appErr.statusCode,
        appErr.code ?? "SEND_FAILED",
      );
      return;
    }
    sendError(res, "Failed to send announcement");
  }
});

/** POST /broadcasts/:id/cancel — cancel draft/scheduled. */
router.post("/:id/cancel", async (req, res) => {
  const user = req.user as { userId: string };
  try {
    const result = await broadcastService.cancel(String(req.params.id), user, req);
    sendSuccess(res, { id: result.id, status: result.status }, "Announcement cancelled");
  } catch (err) {
    const appErr = err as { statusCode?: number; code?: string; message?: string };
    if (appErr.statusCode) {
      sendError(
        res,
        appErr.message ?? "Cancel failed",
        appErr.statusCode,
        appErr.code ?? "CANCEL_FAILED",
      );
      return;
    }
    sendError(res, "Failed to cancel announcement");
  }
});

/** PATCH /broadcasts/:id/ticker — activate/deactivate the ticker surface. */
router.patch("/:id/ticker", validate(z.object({ active: z.boolean() })), async (req, res) => {
  const { active } = req.body as { active: boolean };
  try {
    const result = await broadcastService.setTickerActive(String(req.params.id), active);
    sendSuccess(res, { id: result.id, ticker_active: result.tickerActive }, "Ticker state updated");
  } catch {
    sendNotFound(res, "Announcement not found");
  }
});

/** POST /broadcasts/reconcile-sends — recover rows stranded in `sending`. */
router.post("/reconcile-sends", requireRole("super_admin"), async (_req, res) => {
  const result = await broadcastService.reconcileStuckSends();
  sendSuccess(res, result, "Stuck broadcast sends reconciled");
});

// Audit alias for the send path — keeps the broadcast audit trail explicit.
router.post("/:id/audit-sent", (_req, res) => {
  // Intentional no-op: send() already audits BROADCAST_SENT with the actor.
  sendSuccess(res, null, AuditActions.BROADCAST_SENT);
});

export default router;
