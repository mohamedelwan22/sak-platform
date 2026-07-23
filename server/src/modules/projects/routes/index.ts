import { Router } from "express";
import { ProjectController } from "../controllers/projects.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createProjectSchema, updateProjectSchema } from "../validators/index.js";

const router = Router();
const controller = new ProjectController();

router.get("/", (req, res) => controller.findAll(req, res));

router.get("/:id", (req, res) => controller.findById(req, res));

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.PROJECTS_CREATE),
  validate(createProjectSchema),
  (req, res) => controller.create(req, res),
);

router.put(
  "/:id",
  authenticate,
  requirePermission(Permissions.PROJECTS_UPDATE),
  validate(updateProjectSchema),
  (req, res) => controller.update(req, res),
);

router.delete("/:id", authenticate, requirePermission(Permissions.PROJECTS_DELETE), (req, res) =>
  controller.delete(req, res),
);

export default router;
