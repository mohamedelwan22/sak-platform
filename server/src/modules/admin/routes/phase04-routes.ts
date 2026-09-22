import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { requireRole, requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { adminPhase04Controller } from "../controllers/phase04-admin.controller.js";

const router = Router();

// All Phase 04 admin routes require authentication and staff roles
router.use(authenticate);
router.use(requireRole("admin", "super_admin"));

// Broker management
router.get("/brokers", requirePermission(Permissions.BROKERS_READ), (req, res) =>
  adminPhase04Controller.getBrokers(req, res),
);
router.patch("/brokers/:id/verify", requirePermission(Permissions.BROKER_VERIFY), (req, res) =>
  adminPhase04Controller.verifyBroker(req, res),
);
router.patch(
  "/brokers/:id/deactivate",
  requirePermission(Permissions.BROKER_DEACTIVATE),
  (req, res) => adminPhase04Controller.deactivateBroker(req, res),
);
router.patch(
  "/brokers/:id/activate",
  requirePermission(Permissions.BROKER_DEACTIVATE),
  (req, res) => adminPhase04Controller.activateBroker(req, res),
);

// Customer management
router.get("/customers", requirePermission(Permissions.CUSTOMERS_READ), (req, res) =>
  adminPhase04Controller.getCustomers(req, res),
);
router.patch("/customers/:id/status", requirePermission(Permissions.CUSTOMERS_UPDATE), (req, res) =>
  adminPhase04Controller.updateCustomerStatus(req, res),
);

// Commission management
router.get("/commissions", requirePermission(Permissions.COMMISSIONS_READ), (req, res) =>
  adminPhase04Controller.getCommissionsForApproval(req, res),
);
router.post(
  "/commissions/approve",
  requirePermission(Permissions.COMMISSIONS_APPROVE),
  (req, res) => adminPhase04Controller.approveCommissions(req, res),
);
router.post("/commissions/reject", requirePermission(Permissions.COMMISSIONS_REJECT), (req, res) =>
  adminPhase04Controller.rejectCommissions(req, res),
);

// Lead management
router.get("/leads", requirePermission(Permissions.LEADS_READ), (req, res) =>
  adminPhase04Controller.getLeads(req, res),
);
router.patch("/leads/:id/assign", requirePermission(Permissions.LEADS_ASSIGN), (req, res) =>
  adminPhase04Controller.reassignLead(req, res),
);

// Asset types
router.get("/asset-types", requirePermission(Permissions.CMS_READ), (req, res) =>
  adminPhase04Controller.getAssetTypes(req, res),
);
router.post("/asset-types", requirePermission(Permissions.CMS_UPDATE), (req, res) =>
  adminPhase04Controller.createAssetType(req, res),
);

// Homepage CMS
router.get("/homepage", requirePermission(Permissions.CMS_READ), (req, res) =>
  adminPhase04Controller.getHomepage(req, res),
);
router.patch("/homepage", requirePermission(Permissions.CMS_UPDATE), (req, res) =>
  adminPhase04Controller.updateHomepage(req, res),
);

// Broker attribution correction
router.post(
  "/holdings/:holdingId/attribution",
  requirePermission(Permissions.ATTRIBUTION_CORRECT),
  (req, res) => adminPhase04Controller.correctAttribution(req, res),
);
router.get(
  "/attribution-corrections",
  requirePermission(Permissions.ATTRIBUTION_CORRECT),
  (req, res) => adminPhase04Controller.listAttributionCorrections(req, res),
);

export default router;
