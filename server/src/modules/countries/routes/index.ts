import { Router } from "express";
import { CountryController } from "../controllers/countries.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createCountrySchema, updateCountrySchema } from "../validators/index.js";

const router = Router();
const controller = new CountryController();

router.get("/", authenticate, requirePermission(Permissions.COUNTRIES_READ), (req, res) =>
  controller.findAll(req, res),
);

router.get("/:id", authenticate, requirePermission(Permissions.COUNTRIES_READ), (req, res) =>
  controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.COUNTRIES_CREATE),
  validate(createCountrySchema),
  (req, res) => controller.create(req, res),
);

router.put(
  "/:id",
  authenticate,
  requirePermission(Permissions.COUNTRIES_UPDATE),
  validate(updateCountrySchema),
  (req, res) => controller.update(req, res),
);

router.delete("/:id", authenticate, requirePermission(Permissions.COUNTRIES_DELETE), (req, res) =>
  controller.delete(req, res),
);

export default router;
