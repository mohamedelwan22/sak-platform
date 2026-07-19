import { Router } from "express";
import { AuditController } from "../controllers/audit.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";

const router = Router();
const controller = new AuditController();

// All audit routes require authentication + audit.read permission
router.use(authenticate);
router.use(requirePermission(Permissions.AUDIT_READ));

router.get("/search", (req, res) => controller.searchLogs(req, res));
router.get("/user/:userId", (req, res) => controller.getLogsByUser(req, res));
router.get("/entity/:entity/:entity_id", (req, res) => controller.getLogsByEntity(req, res));
router.get("/:id", (req, res) => controller.getLogById(req, res));
router.get("/", (req, res) => controller.getLogs(req, res));

export default router;
