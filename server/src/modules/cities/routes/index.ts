import { Router } from "express";
import { CityController } from "../controllers/cities.controller.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { createCitySchema, updateCitySchema } from "../validators/index.js";

const router = Router();
const controller = new CityController();

router.get("/", authenticate, requirePermission(Permissions.CITIES_READ), (req, res) =>
  controller.findAll(req, res),
);

router.get("/:id", authenticate, requirePermission(Permissions.CITIES_READ), (req, res) =>
  controller.findById(req, res),
);

router.post(
  "/",
  authenticate,
  requirePermission(Permissions.CITIES_CREATE),
  validate(createCitySchema),
  (req, res) => controller.create(req, res),
);

router.put(
  "/:id",
  authenticate,
  requirePermission(Permissions.CITIES_UPDATE),
  validate(updateCitySchema),
  (req, res) => controller.update(req, res),
);

router.delete("/:id", authenticate, requirePermission(Permissions.CITIES_DELETE), (req, res) =>
  controller.delete(req, res),
);

export default router;
