import { Router } from "express";
import { GoldController } from "../controllers/gold.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";

const router = Router();
const controller = new GoldController();

router.get("/", (req, res) => controller.findAll(req, res));
router.get("/:id", (req, res) => controller.findById(req, res));
router.post("/", authenticate, requirePermission(Permissions.SETTINGS_UPDATE), (req, res) =>
  controller.create(req, res),
);
router.put("/:id", authenticate, requirePermission(Permissions.SETTINGS_UPDATE), (req, res) =>
  controller.update(req, res),
);
router.delete("/:id", authenticate, requirePermission(Permissions.SETTINGS_UPDATE), (req, res) =>
  controller.delete(req, res),
);

export default router;
