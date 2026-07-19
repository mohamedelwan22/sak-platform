import { Router } from "express";
import { PermissionController } from "../controllers/permissions.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../middleware/index.js";
import { Permissions } from "../constants/index.js";

const router = Router();
const controller = new PermissionController();

router.get("/", authenticate, requirePermission(Permissions.ROLES_READ), (req, res) =>
  controller.findAll(req, res),
);

router.get("/:id", authenticate, requirePermission(Permissions.ROLES_READ), (req, res) =>
  controller.findById(req, res),
);

router.post("/", authenticate, requirePermission(Permissions.ROLES_UPDATE), (req, res) =>
  controller.create(req, res),
);

router.put("/:id", authenticate, requirePermission(Permissions.ROLES_UPDATE), (req, res) =>
  controller.update(req, res),
);

router.delete("/:id", authenticate, requirePermission(Permissions.ROLES_UPDATE), (req, res) =>
  controller.delete(req, res),
);

export default router;
