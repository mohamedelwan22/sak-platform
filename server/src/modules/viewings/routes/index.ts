import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { viewingsController } from "../controllers/viewings.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", (req, res) => viewingsController.createViewing(req, res));
router.get("/", requirePermission(Permissions.VIEWINGS_READ), (req, res) =>
  viewingsController.getViewings(req, res),
);
router.patch("/:id/status", requirePermission(Permissions.VIEWINGS_UPDATE), (req, res) =>
  viewingsController.updateViewingStatus(req, res),
);

export default router;
