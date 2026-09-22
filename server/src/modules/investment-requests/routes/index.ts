import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { investmentRequestsController } from "../controllers/investment-requests.controller.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authenticate);

router.post("/", (req, res) => investmentRequestsController.create(req, res));
router.get("/", requirePermission(Permissions.INVESTMENTS_READ), (req, res) =>
  investmentRequestsController.list(req, res),
);
router.get("/stats", requirePermission(Permissions.INVESTMENTS_READ), (req, res) =>
  investmentRequestsController.stats(req, res),
);
router.get("/:id", requirePermission(Permissions.INVESTMENTS_READ), (req, res) =>
  investmentRequestsController.getById(req, res),
);
router.patch("/:id/status", requirePermission(Permissions.INVESTMENTS_UPDATE), (req, res) =>
  investmentRequestsController.transition(req, res),
);

// Task 6: manual payment proof lifecycle
router.post("/:id/payment-proof", upload.single("proof"), (req, res) =>
  investmentRequestsController.uploadPaymentProof(req, res),
);
router.post(
  "/:id/payment/confirm",
  requirePermission(Permissions.INVESTMENTS_UPDATE),
  (req, res) => investmentRequestsController.confirmPayment(req, res),
);
router.post(
  "/:id/payment/reject",
  requirePermission(Permissions.INVESTMENTS_UPDATE),
  (req, res) => investmentRequestsController.rejectPayment(req, res),
);

export default router;
