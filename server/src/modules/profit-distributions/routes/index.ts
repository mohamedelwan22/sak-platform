import { Router } from "express";
import { ProfitDistributionController } from "../controllers/profit-distributions.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createProfitDistributionSchema } from "../validators/index.js";

const router = Router();
const controller = new ProfitDistributionController();

router.get(
  "/",
  authenticate,
  requirePermission(Permissions.PROFIT_DISTRIBUTIONS_READ),
  (req, res) => controller.findAll(req, res),
);

router.get(
  "/count",
  authenticate,
  requirePermission(Permissions.PROFIT_DISTRIBUTIONS_READ),
  (req, res) => controller.count(req, res),
);

router.get(
  "/payouts",
  authenticate,
  requirePermission(Permissions.PROFIT_DISTRIBUTIONS_READ),
  (req, res) => controller.findPayouts(req, res),
);

router.get("/my-payouts", authenticate, (req, res) => controller.findPayoutsByUserId(req, res));

router.get(
  "/preview",
  authenticate,
  requirePermission(Permissions.PROFIT_DISTRIBUTIONS_CREATE),
  (req, res) => controller.getPreview(req, res),
);

router.get(
  "/:id",
  authenticate,
  requirePermission(Permissions.PROFIT_DISTRIBUTIONS_READ),
  (req, res) => controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.PROFIT_DISTRIBUTIONS_CREATE),
  validate(createProfitDistributionSchema),
  (req, res) => controller.create(req, res),
);

export default router;
