import { Router } from "express";
import { InvestorController } from "../controllers/investors.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createInvestorSchema, updateInvestorSchema } from "../validators/index.js";

const router = Router();
const controller = new InvestorController();

router.get("/", authenticate, requirePermission(Permissions.INVESTORS_READ), (req, res) =>
  controller.findAll(req, res),
);

router.get("/:id", authenticate, requirePermission(Permissions.INVESTORS_READ), (req, res) =>
  controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.INVESTORS_CREATE),
  validate(createInvestorSchema),
  (req, res) => controller.create(req, res),
);

router.put(
  "/:id",
  authenticate,
  requirePermission(Permissions.INVESTORS_UPDATE),
  validate(updateInvestorSchema),
  (req, res) => controller.update(req, res),
);

router.delete("/:id", authenticate, requirePermission(Permissions.INVESTORS_DELETE), (req, res) =>
  controller.delete(req, res),
);

router.post(
  "/:id/restore",
  authenticate,
  requirePermission(Permissions.INVESTORS_UPDATE),
  (req, res) => controller.restore(req, res),
);

export default router;
