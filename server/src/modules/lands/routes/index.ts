import { Router } from "express";
import { z } from "zod";
import { LandController } from "../controllers/lands.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission, requireRole } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { normalizeBody } from "../../../middlewares/normalize-body.middleware.js";
import {
  createLandSchema,
  updateLandSchema,
  listLandsQuerySchema,
} from "../validators/index.js";

const router = Router();
const controller = new LandController();

// Admin land reads are gated to staff. Public consumers use /public/lands.
const landIdParamsSchema = z.object({ id: z.string().uuid("Invalid land id") });

router.get(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  validate(listLandsQuerySchema, "query"),
  (req, res) => controller.findAll(req, res),
);

router.get(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  validate(landIdParamsSchema, "params"),
  (req, res) => controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  requirePermission(Permissions.LANDS_CREATE),
  normalizeBody,
  validate(createLandSchema),
  (req, res) => controller.create(req, res),
);

router.put(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  requirePermission(Permissions.LANDS_UPDATE),
  validate(landIdParamsSchema, "params"),
  normalizeBody,
  validate(updateLandSchema),
  (req, res) => controller.update(req, res),
);

router.delete(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  requirePermission(Permissions.LANDS_DELETE),
  validate(landIdParamsSchema, "params"),
  (req, res) => controller.delete(req, res),
);

export default router;