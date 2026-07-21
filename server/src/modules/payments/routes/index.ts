import { Router } from "express";
import multer from "multer";
import { PaymentController } from "../controllers/payments.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createPaymentSchema, reviewPaymentSchema } from "../validators/index.js";

const router = Router();
const controller = new PaymentController();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/", authenticate, requirePermission(Permissions.PAYMENTS_READ), (req, res) =>
  controller.findAll(req, res),
);

router.get("/:id", authenticate, requirePermission(Permissions.PAYMENTS_READ), (req, res) =>
  controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.PAYMENTS_CREATE),
  upload.array("proof", 1),
  validate(createPaymentSchema),
  (req, res) => controller.create(req, res),
);

router.post(
  "/:id/approve",
  authenticate,
  requirePermission(Permissions.PAYMENTS_UPDATE),
  (req, res) => controller.approve(req, res),
);

router.post(
  "/:id/reject",
  authenticate,
  requirePermission(Permissions.PAYMENTS_UPDATE),
  validate(reviewPaymentSchema),
  (req, res) => controller.reject(req, res),
);

export default router;
