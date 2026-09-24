import { Router } from "express";
import rateLimit from "express-rate-limit";
import { MarketController } from "../controllers/market.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { goldHistoryQuerySchema, manualOverrideSchema } from "../validators/index.js";

const router = Router();
const controller = new MarketController();

// Market data is public and served from a 30s backend cache; a generous
// rate limit only guards against abusive polling.
const marketLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many market data requests. Please try again later.",
    },
    timestamp: new Date().toISOString(),
  },
});

// ── Public market data (backend-calculated; clients never submit prices) ──

router.get("/gold/current", marketLimiter, (req, res) => controller.getGoldCurrent(req, res));

router.get("/gold/history", marketLimiter, validate(goldHistoryQuerySchema, "query"), (req, res) =>
  controller.getGoldHistory(req, res),
);

router.get("/sak-price", marketLimiter, (req, res) => controller.getSakPrice(req, res));

// ── Admin gold market controls ──

router.get("/admin/status", authenticate, requirePermission(Permissions.GOLD_READ), (req, res) =>
  controller.getAdminStatus(req, res),
);

router.post(
  "/admin/refresh",
  authenticate,
  requirePermission(Permissions.GOLD_UPDATE),
  (req, res) => controller.adminRefresh(req, res),
);

router.post(
  "/admin/override",
  authenticate,
  requirePermission(Permissions.GOLD_UPDATE),
  validate(manualOverrideSchema),
  (req, res) => controller.adminOverride(req, res),
);

export default router;
