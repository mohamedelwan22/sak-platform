import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { affiliateController } from "../controllers/affiliate.controller.js";

const router = Router();

// All affiliate routes require authentication
router.use(authenticate);

// Get referral link with code
router.get("/referral-link", (req, res) => affiliateController.getReferralLink(req, res));

// Get referral statistics
router.get("/stats", (req, res) => affiliateController.getStats(req, res));

// Get commission history
router.get("/commissions", (req, res) => affiliateController.getCommissions(req, res));

// Request commission withdrawal
router.post("/withdrawal-request", (req, res) => affiliateController.requestWithdrawal(req, res));

export default router;
