import { Router } from "express";
import { PerformanceController } from "../controllers/performance.controller.js";
import { authenticate } from "../../auth/middleware/index.js";

const router = Router();
const controller = new PerformanceController();

router.get("/", authenticate, (req, res) => controller.getReport(req, res));

export default router;
