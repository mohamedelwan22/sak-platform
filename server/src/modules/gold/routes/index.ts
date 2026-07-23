import { Router } from "express";
import { GoldController } from "../controllers/gold.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createGoldPriceSchema } from "../validators/index.js";

const router = Router();
const controller = new GoldController();

router.get("/", (req, res) => controller.findLatest(req, res));

router.get("/latest", (req, res) => controller.findLatest(req, res));

router.get("/history", (req, res) => controller.findAll(req, res));

router.get("/statistics", (req, res) => controller.getStatistics(req, res));

router.get("/:id", (req, res) => controller.findById(req, res));

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.GOLD_CREATE),
  validate(createGoldPriceSchema),
  (req, res) => controller.create(req, res),
);

router.delete("/:id", authenticate, requirePermission(Permissions.GOLD_DELETE), (req, res) =>
  controller.delete(req, res),
);

export default router;
