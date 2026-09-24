import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { leadsController } from "../controllers/leads.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", (req, res) => leadsController.createLead(req, res));

router.get("/", requirePermission(Permissions.LEADS_READ), (req, res) =>
  leadsController.getLeads(req, res),
);
router.get("/:id", requirePermission(Permissions.LEADS_READ), (req, res) =>
  leadsController.getLeadById(req, res),
);
router.patch("/:id/status", requirePermission(Permissions.LEADS_UPDATE), (req, res) =>
  leadsController.updateLeadStatus(req, res),
);
router.post("/:id/assign", requirePermission(Permissions.LEADS_ASSIGN), (req, res) =>
  leadsController.assignLead(req, res),
);

export default router;
