import { Router } from "express";
import { CertificateController } from "../controllers/certificates.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { generateCertificateSchema } from "../validators/index.js";

const router = Router();
const controller = new CertificateController();

router.get("/", authenticate, (req, res) => controller.findAll(req, res));

router.get("/count", authenticate, (req, res) => controller.count(req, res));

router.get("/:id", authenticate, (req, res) => controller.findById(req, res));

router.get("/:id/download", authenticate, (req, res) => controller.download(req, res));

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.CERTIFICATES_CREATE),
  validate(generateCertificateSchema),
  (req, res) => controller.generate(req, res),
);

export default router;
