import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { MarketplaceController } from "../controllers/marketplace.controller.js";

const router = Router();
const controller = new MarketplaceController();

router.get("/catalog", authenticate, (req, res) => controller.getCatalog(req, res));
router.get("/orders", authenticate, (req, res) => controller.getMyOrders(req, res));
router.post("/buy", authenticate, (req, res) => controller.buy(req, res));
router.post("/sell", authenticate, (req, res) => controller.sell(req, res));
router.post("/convert", authenticate, (req, res) => controller.convert(req, res));

export default router;
