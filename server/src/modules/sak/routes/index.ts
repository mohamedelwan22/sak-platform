import { Router } from "express";
import { SakController } from "../controllers/sak.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createSakConfigSchema, updateSakConfigSchema } from "../validators/index.js";

const router = Router();
const controller = new SakController();

router.get("/", (req, res) => controller.findCurrent(req, res));

router.get("/current", (req, res) => controller.findCurrent(req, res));

router.get("/all", authenticate, requirePermission(Permissions.SAK_READ), (req, res) =>
  controller.findAll(req, res),
);

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.SAK_CREATE),
  validate(createSakConfigSchema),
  (req, res) => controller.create(req, res),
);

router.put(
  "/:id",
  authenticate,
  requirePermission(Permissions.SAK_UPDATE),
  validate(updateSakConfigSchema),
  (req, res) => controller.update(req, res),
);

router.delete("/:id", authenticate, requirePermission(Permissions.SAK_DELETE), (req, res) =>
  controller.delete(req, res),
);

export default router;
