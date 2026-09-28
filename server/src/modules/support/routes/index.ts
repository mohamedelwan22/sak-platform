import { Router } from "express";
import multer from "multer";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { SupportController } from "../controllers/support.controller.js";
import { SupportAdminController } from "../controllers/support-admin.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requireRole } from "../../permissions/middleware/index.js";
import {
  SUPPORT_CATEGORIES,
  TICKET_ATTACHMENT_MAX_BYTES,
  TICKET_ATTACHMENT_MAX_FILES,
  TICKET_CREATE_MAX,
  TICKET_CREATE_WINDOW_MS,
  TICKET_REPLY_MAX,
  TICKET_REPLY_WINDOW_MS,
} from "../constants/index.js";
import { ticketAttachmentFilter } from "../services/support.service.js";

const router = Router();
const controller = new SupportController();
const adminController = new SupportAdminController();

const uploadAttachments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TICKET_ATTACHMENT_MAX_BYTES, files: TICKET_ATTACHMENT_MAX_FILES },
  fileFilter: ticketAttachmentFilter,
});

/** Per-user ticket creation rate limit (spam prevention). */
const ticketCreateLimiter = rateLimit({
  windowMs: TICKET_CREATE_WINDOW_MS,
  max: TICKET_CREATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // `ipKeyGenerator` is the IPv6-safe helper: it normalises IPv6 addresses to a
  // /64 subnet key so a single client cannot trivially rotate addresses to
  // bypass the limit (ERR_ERL_KEY_GEN_IPV6). Same limits, window and intent.
  keyGenerator: (req) =>
    `ticket-create:${req.user?.userId ?? ipKeyGenerator(req.ip ?? "127.0.0.1")}`,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_TICKETS",
      message: "Too many tickets created. Please wait a moment before creating another.",
    },
    timestamp: new Date().toISOString(),
  },
});

/** Per-user reply rate limit (message flooding prevention). */
const ticketReplyLimiter = rateLimit({
  windowMs: TICKET_REPLY_WINDOW_MS,
  max: TICKET_REPLY_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // IPv6-safe IP fallback; see ticketCreateLimiter above.
  keyGenerator: (req) =>
    `ticket-reply:${req.user?.userId ?? ipKeyGenerator(req.ip ?? "127.0.0.1")}`,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_MESSAGES",
      message: "Too many messages sent. Please wait a moment before sending again.",
    },
    timestamp: new Date().toISOString(),
  },
});

function categoryFromBody(req: Request, _res: unknown, next: (err?: unknown) => void) {
  // multer body fields are strings; validate the category enum before service
  (req as unknown as { body: Record<string, unknown> }).body = { ...req.body };
  next();
}
type Request = import("express").Request;

// ── Investor self-service endpoints ─────────────────────────────────────────

router.get("/tickets", authenticate, (req, res) => controller.listTickets(req, res));

router.get("/tickets/:id", authenticate, (req, res) => controller.getTicket(req, res));

router.get("/tickets/:id/audit", authenticate, (req, res) => controller.getTicketAudit(req, res));

router.get("/tickets/:id/attachments/:attachmentId", authenticate, (req, res) =>
  controller.downloadAttachment(req, res),
);

router.post(
  "/tickets",
  authenticate,
  ticketCreateLimiter,
  uploadAttachments.array("files", TICKET_ATTACHMENT_MAX_FILES),
  categoryFromBody,
  (req, res, next) => {
    const category = String((req.body as Record<string, unknown>).category ?? "");
    if (!(SUPPORT_CATEGORIES as readonly string[]).includes(category)) {
      res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid ticket category",
          details: { category: "Invalid category" },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  },
  (req, res) => controller.createTicket(req, res),
);

router.post(
  "/tickets/:id/messages",
  authenticate,
  ticketReplyLimiter,
  uploadAttachments.array("files", TICKET_ATTACHMENT_MAX_FILES),
  (req, res) => controller.replyToTicket(req, res),
);

router.patch("/tickets/:id/status", authenticate, (req, res) => controller.changeStatus(req, res));

// ── Admin/support endpoints (staff only) ────────────────────────────────────

router.use("/admin", authenticate, requireRole("admin", "super_admin"));

router.get("/admin/meta", (req, res) => adminController.getMeta(req, res));

router.get("/admin/assignees", (req, res) => adminController.listAssignees(req, res));

router.get("/admin/tickets", (req, res) => controller.listTickets(req, res));

router.get("/admin/tickets/:id", (req, res) => controller.getTicket(req, res));

router.get("/admin/tickets/:id/audit", (req, res) => controller.getTicketAudit(req, res));

router.get("/admin/tickets/:id/attachments/:attachmentId", (req, res) =>
  controller.downloadAttachment(req, res),
);

router.post(
  "/admin/tickets/:id/reply",
  ticketReplyLimiter,
  uploadAttachments.array("files", TICKET_ATTACHMENT_MAX_FILES),
  (req, res) => adminController.replyToTicket(req, res),
);

router.patch("/admin/tickets/:id", (req, res) => adminController.updateTicket(req, res));

router.post("/admin/tickets/:id/assign", (req, res) => adminController.assignTicket(req, res));

export default router;
