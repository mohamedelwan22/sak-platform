import { Router } from "express";
import { AuditController } from "../controllers/audit.controller.js";
import { authenticate, authorize } from "../../auth/middleware/index.js";

const router = Router();
const controller = new AuditController();

router.get("/", authenticate, authorize("super_admin", "admin"), (req, res) =>
  controller.getLogs(req, res),
);

export default router;
