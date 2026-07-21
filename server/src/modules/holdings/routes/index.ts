import { Router } from "express";
import { HoldingController } from "../controllers/holdings.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";

const router = Router();
const controller = new HoldingController();

router.get("/", authenticate, requirePermission(Permissions.INVESTMENTS_READ), (req, res) =>
  controller.findAll(req, res),
);
router.get("/:id", authenticate, requirePermission(Permissions.INVESTMENTS_READ), (req, res) =>
  controller.findById(req, res),
);
router.post("/", authenticate, requirePermission(Permissions.INVESTMENTS_CREATE), (req, res) =>
  controller.create(req, res),
);
router.put("/:id", authenticate, requirePermission(Permissions.INVESTMENTS_UPDATE), (req, res) =>
  controller.update(req, res),
);
router.delete("/:id", authenticate, requirePermission(Permissions.INVESTMENTS_DELETE), (req, res) =>
  controller.delete(req, res),
);

export default router;
