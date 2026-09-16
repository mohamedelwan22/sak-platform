import { Router } from "express";
import { z } from "zod";
import { ProjectController } from "../controllers/projects.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission, requireRole } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { normalizeBody } from "../../../middlewares/normalize-body.middleware.js";
import { createProjectSchema, updateProjectSchema, listProjectsQuerySchema } from "../validators/index.js";

const router = Router();
const controller = new ProjectController();

const projectIdParamsSchema = z.object({ id: z.string().uuid("Invalid project id") });

// Admin project reads are gated to staff. Public consumers use /public/projects.
router.get(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  validate(listProjectsQuerySchema, "query"),
  (req, res) => controller.findAll(req, res),
);

router.get(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  validate(projectIdParamsSchema, "params"),
  (req, res) => controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  requirePermission(Permissions.PROJECTS_CREATE),
  normalizeBody,
  validate(createProjectSchema),
  (req, res) => controller.create(req, res),
);

router.put(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  requirePermission(Permissions.PROJECTS_UPDATE),
  validate(projectIdParamsSchema, "params"),
  normalizeBody,
  validate(updateProjectSchema),
  (req, res) => controller.update(req, res),
);

router.delete(
  "/:id",
  authenticate,
  requireRole("admin", "super_admin"),
  requirePermission(Permissions.PROJECTS_DELETE),
  validate(projectIdParamsSchema, "params"),
  (req, res) => controller.delete(req, res),
);

export default router;