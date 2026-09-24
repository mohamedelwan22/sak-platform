import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { PaymentMethodsController } from "../controllers/payment-methods.controller.js";

const router = Router();
const controller = new PaymentMethodsController();

router.get("/", authenticate, (req, res) => controller.findAll(req, res));
router.get("/:id", authenticate, (req, res) => controller.findById(req, res));
router.post("/", authenticate, (req, res) => controller.create(req, res));
router.patch("/:id", authenticate, (req, res) => controller.update(req, res));
router.delete("/:id", authenticate, (req, res) => controller.delete(req, res));

export default router;
