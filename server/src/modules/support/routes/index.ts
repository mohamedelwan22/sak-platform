import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { SupportController } from "../controllers/support.controller.js";

const router = Router();
const controller = new SupportController();

router.get("/", authenticate, (req, res) => controller.findAll(req, res));
router.get("/:id", authenticate, (req, res) => controller.findById(req, res));
router.post("/", authenticate, (req, res) => controller.create(req, res));
router.put("/:id", authenticate, (req, res) => controller.update(req, res));
router.delete("/:id", authenticate, (req, res) => controller.delete(req, res));

export default router;
