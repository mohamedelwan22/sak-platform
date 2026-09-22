import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { brokersController } from "../controllers/brokers.controller.js";

const router = Router();

// All broker routes require authentication
router.use(authenticate);

// Own-profile endpoints (broker resolves own profile from the token)
router.post("/profile", (req, res) => brokersController.createProfile(req, res));
router.get("/me", (req, res) => brokersController.getMyProfile(req, res));
router.patch("/me", (req, res) => brokersController.updateMyProfile(req, res));

// Broker-specific endpoints (IDOR-protected: owner or staff)
router.get("/:id", (req, res) => brokersController.getProfile(req, res));
router.patch("/:id", (req, res) => brokersController.updateProfile(req, res));
router.get("/:id/clients", (req, res) => brokersController.getClients(req, res));

// Admin listing
router.get("/", requirePermission(Permissions.BROKERS_READ), (req, res) =>
  brokersController.getBrokers(req, res),
);

export default router;
