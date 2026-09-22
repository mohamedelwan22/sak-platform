import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { requireRole, requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { cmsController } from "../controllers/cms.controller.js";

const router = Router();

// Public routes
router.get("/homepage", (req, res) => cmsController.getHomepage(req, res));
router.get("/asset-types", (req, res) => cmsController.getAssetTypes(req, res));
router.get("/asset-types/:id", (req, res) => cmsController.getAssetType(req, res));
router.get("/asset-field-values/:landId", (req, res) => cmsController.getAssetFieldValues(req, res));

// Admin routes
router.post("/asset-types", authenticate, requireRole("admin", "super_admin"), requirePermission(Permissions.CMS_UPDATE), (req, res) =>
  cmsController.createAssetType(req, res),
);
router.post("/asset-types/:typeId/fields", authenticate, requireRole("admin", "super_admin"), requirePermission(Permissions.CMS_UPDATE), (req, res) =>
  cmsController.addAssetField(req, res),
);
router.put("/asset-field-values/:landId", authenticate, requireRole("admin", "super_admin"), requirePermission(Permissions.CMS_UPDATE), (req, res) =>
  cmsController.setAssetFieldValues(req, res),
);
router.patch("/homepage", authenticate, requireRole("admin", "super_admin"), requirePermission(Permissions.CMS_UPDATE), (req, res) =>
  cmsController.updateHomepage(req, res),
);

export default router;