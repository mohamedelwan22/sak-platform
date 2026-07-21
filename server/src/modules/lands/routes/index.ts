import { Router } from "express";
import { LandController } from "../controllers/lands.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";

const router = Router();
const controller = new LandController();

router.get("/", (req, res) => controller.findAll(req, res));
router.get("/:id", (req, res) => controller.findById(req, res));
router.post("/", authenticate, requirePermission(Permissions.LANDS_CREATE), (req, res) =>
  controller.create(req, res),
);
router.put("/:id", authenticate, requirePermission(Permissions.LANDS_UPDATE), (req, res) =>
  controller.update(req, res),
);
router.delete("/:id", authenticate, requirePermission(Permissions.LANDS_DELETE), (req, res) =>
  controller.delete(req, res),
);

export default router;
