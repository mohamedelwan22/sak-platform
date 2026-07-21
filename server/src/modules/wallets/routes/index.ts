import { Router } from "express";
import { WalletController } from "../controllers/wallets.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createWalletSchema, updateWalletSchema } from "../validators/index.js";

const router = Router();
const controller = new WalletController();

router.get("/", authenticate, requirePermission(Permissions.WALLETS_READ), (req, res) =>
  controller.findAll(req, res),
);

router.get("/:id", authenticate, requirePermission(Permissions.WALLETS_READ), (req, res) =>
  controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.WALLETS_CREATE),
  validate(createWalletSchema),
  (req, res) => controller.create(req, res),
);

router.put(
  "/:id",
  authenticate,
  requirePermission(Permissions.WALLETS_UPDATE),
  validate(updateWalletSchema),
  (req, res) => controller.update(req, res),
);

router.delete("/:id", authenticate, requirePermission(Permissions.WALLETS_DELETE), (req, res) =>
  controller.delete(req, res),
);

router.post(
  "/:id/restore",
  authenticate,
  requirePermission(Permissions.WALLETS_UPDATE),
  (req, res) => controller.restore(req, res),
);

export default router;
