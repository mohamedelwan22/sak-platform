import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} from "../validators/index.js";
import rateLimit from "express-rate-limit";

const router = Router();
const controller = new AuthController();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many authentication attempts. Please try again later.",
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many token refresh attempts. Please try again later.",
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, validate(registerSchema), (req, res) =>
  controller.register(req, res),
);
router.post("/login", authLimiter, validate(loginSchema), (req, res) => controller.login(req, res));
router.post("/refresh", refreshLimiter, validate(refreshTokenSchema), (req, res) =>
  controller.refreshToken(req, res),
);
router.post("/logout", validate(logoutSchema), (req, res) => controller.logout(req, res));
router.post("/logout-all", authenticate, (req, res) => controller.logoutAll(req, res));
router.get("/me", authenticate, (req, res) => controller.me(req, res));

export default router;
