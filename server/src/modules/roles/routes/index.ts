import { Router } from "express";
import { RoleController } from "../controllers/roles.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requireRole } from "../../permissions/middleware/index.js";

const router = Router();
const controller = new RoleController();

router.get("/", authenticate, requireRole("super_admin", "admin"), (req, res) =>
  controller.findAll(req, res),
);

router.get("/:id", authenticate, requireRole("super_admin", "admin"), (req, res) =>
  controller.findById(req, res),
);

router.put("/:id/permissions", authenticate, requireRole("super_admin"), (req, res) =>
  controller.updatePermissions(req, res),
);

router.get(
  "/users/:id/permissions",
  authenticate,
  requireRole("super_admin", "admin"),
  (req, res) => controller.getUserPermissions(req, res),
);

export default router;
