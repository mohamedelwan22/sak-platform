import { Router } from "express";
import { HoldingController } from "../controllers/holdings.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createHoldingSchema, updateHoldingSchema } from "../validators/index.js";

const router = Router();
const controller = new HoldingController();

router.get("/me", authenticate, (req, res) => controller.findByUserId(req, res));

router.get(
  "/portfolio-summary",
  authenticate,
  (req, res) => controller.getPortfolioSummary(req, res),
);

router.get("/", authenticate, requirePermission(Permissions.INVESTMENTS_READ), (req, res) =>
  controller.findAll(req, res),
);

router.get("/:id", authenticate, requirePermission(Permissions.INVESTMENTS_READ), (req, res) =>
  controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.INVESTMENTS_CREATE),
  validate(createHoldingSchema),
  (req, res) => controller.create(req, res),
);

router.put(
  "/:id",
  authenticate,
  requirePermission(Permissions.INVESTMENTS_UPDATE),
  validate(updateHoldingSchema),
  (req, res) => controller.update(req, res),
);

router.delete(
  "/:id",
  authenticate,
  requirePermission(Permissions.INVESTMENTS_DELETE),
  (req, res) => controller.delete(req, res),
);

export default router;
