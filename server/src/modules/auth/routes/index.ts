import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { PasswordResetController } from "../controllers/password-reset.controller.js";
import { authenticate } from "../middleware/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} from "../validators/index.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/password-reset.validators.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const router = Router();
const controller = new AuthController();
const passwordResetController = new PasswordResetController();

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

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `fp:${ipKeyGenerator(req.ip ?? "127.0.0.1")}:${req.body?.email ?? ""}`,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many password reset attempts. Please try again later.",
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many password reset attempts. Please try again later.",
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

router.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordSchema), (req, res) =>
  passwordResetController.forgotPassword(req, res),
);
router.post("/reset-password", resetPasswordLimiter, validate(resetPasswordSchema), (req, res) =>
  passwordResetController.resetPassword(req, res),
);

export default router;
