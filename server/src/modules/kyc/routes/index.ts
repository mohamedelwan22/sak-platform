import { Router } from "express";
import multer from "multer";
import { KycController } from "../controllers/kyc.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createKycSchema, reviewKycSchema } from "../validators/index.js";

const router = Router();
const controller = new KycController();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/", authenticate, requirePermission(Permissions.KYC_READ), (req, res) =>
  controller.findAll(req, res),
);

router.get("/:id", authenticate, requirePermission(Permissions.KYC_READ), (req, res) =>
  controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.KYC_CREATE),
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  validate(createKycSchema),
  (req, res) => controller.create(req, res),
);

router.post("/:id/approve", authenticate, requirePermission(Permissions.KYC_UPDATE), (req, res) =>
  controller.approve(req, res),
);

router.post(
  "/:id/reject",
  authenticate,
  requirePermission(Permissions.KYC_UPDATE),
  validate(reviewKycSchema),
  (req, res) => controller.reject(req, res),
);

export default router;
