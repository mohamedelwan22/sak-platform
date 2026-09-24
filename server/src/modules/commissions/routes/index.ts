import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { commissionsController } from "../controllers/commissions.controller.js";

const router = Router();

router.use(authenticate);

// Staff-only commission management
router.get("/", requirePermission(Permissions.COMMISSIONS_READ), (req, res) =>
  commissionsController.getCommissions(req, res),
);
router.post("/approve", requirePermission(Permissions.COMMISSIONS_APPROVE), (req, res) =>
  commissionsController.approveCommissions(req, res),
);
router.post("/reject", requirePermission(Permissions.COMMISSIONS_REJECT), (req, res) =>
  commissionsController.rejectCommissions(req, res),
);

export default router;
