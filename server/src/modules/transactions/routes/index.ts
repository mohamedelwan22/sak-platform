import { Router } from "express";
import { TransactionController } from "../controllers/transactions.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createTransactionSchema, rejectTransactionSchema } from "../validators/index.js";

const router = Router();
const controller = new TransactionController();

router.get("/", authenticate, requirePermission(Permissions.TRANSACTIONS_READ), (req, res) =>
  controller.findAll(req, res),
);

router.get("/:id", authenticate, requirePermission(Permissions.TRANSACTIONS_READ), (req, res) =>
  controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.TRANSACTIONS_CREATE),
  validate(createTransactionSchema),
  (req, res) => controller.create(req, res),
);

router.post(
  "/:id/approve",
  authenticate,
  requirePermission(Permissions.TRANSACTIONS_UPDATE),
  (req, res) => controller.approve(req, res),
);

router.post(
  "/:id/reject",
  authenticate,
  requirePermission(Permissions.TRANSACTIONS_UPDATE),
  validate(rejectTransactionSchema),
  (req, res) => controller.reject(req, res),
);

router.delete(
  "/:id",
  authenticate,
  requirePermission(Permissions.TRANSACTIONS_DELETE),
  (req, res) => controller.delete(req, res),
);

export default router;
